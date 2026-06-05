/**
 * UK halal restaurant extractor — Overpass API → Supabase restaurants table.
 * Run: npm run extract
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const FETCH_TIMEOUT_MS = 90000;
const RADIUS_M = 15000;
const BATCH_SIZE = 50;
const CITY_DELAY_MS = 8000;
const RETRY_DELAY_MS = 10000;
const MAX_RETRIES = 3;

const UK_LAT_MIN = 49;
const UK_LAT_MAX = 61;
const UK_LNG_MIN = -8;
const UK_LNG_MAX = 2;

/** @type {{ name: string; lat: number; lon: number }[]} */
const UK_CITIES = [
  { name: "London", lat: 51.5074, lon: -0.1278 },
  { name: "Birmingham", lat: 52.4862, lon: -1.8904 },
  { name: "Manchester", lat: 53.4808, lon: -2.2426 },
  { name: "Leeds", lat: 53.8008, lon: -1.5491 },
  { name: "Sheffield", lat: 53.3811, lon: -1.4701 },
  { name: "Bradford", lat: 53.795, lon: -1.7594 },
  { name: "Liverpool", lat: 53.4084, lon: -2.9916 },
  { name: "Bristol", lat: 51.4545, lon: -2.5879 },
  { name: "Leicester", lat: 52.6369, lon: -1.1398 },
  { name: "Coventry", lat: 52.4068, lon: -1.5197 },
  { name: "Nottingham", lat: 52.9548, lon: -1.1581 },
  { name: "Newcastle", lat: 54.9783, lon: -1.6178 },
  { name: "Glasgow", lat: 55.8642, lon: -4.2518 },
  { name: "Edinburgh", lat: 55.9533, lon: -3.1883 },
  { name: "Cardiff", lat: 51.4816, lon: -3.1791 },
  { name: "Belfast", lat: 54.5973, lon: -5.9301 },
  { name: "Southampton", lat: 50.9097, lon: -1.4044 },
  { name: "Portsmouth", lat: 50.8198, lon: -1.088 },
  { name: "Oxford", lat: 51.752, lon: -1.2577 },
  { name: "Cambridge", lat: 52.2053, lon: 0.1218 },
  { name: "Brighton", lat: 50.8225, lon: -0.1372 },
  { name: "Derby", lat: 52.9225, lon: -1.4746 },
  { name: "Wolverhampton", lat: 52.5862, lon: -2.1282 },
  { name: "Stoke-on-Trent", lat: 53.0027, lon: -2.1794 },
  { name: "Preston", lat: 53.7632, lon: -2.7031 },
  { name: "Blackburn", lat: 53.7485, lon: -2.4878 },
  { name: "Luton", lat: 51.8787, lon: -0.42 },
  { name: "Slough", lat: 51.5105, lon: -0.595 },
  { name: "Reading", lat: 51.4543, lon: -0.9781 },
  { name: "Sunderland", lat: 54.9069, lon: -1.3838 },
  { name: "Middlesbrough", lat: 54.5742, lon: -1.235 },
  { name: "Bolton", lat: 53.578, lon: -2.4297 },
  { name: "Huddersfield", lat: 53.6458, lon: -1.785 },
  { name: "Plymouth", lat: 50.3755, lon: -4.1427 },
  { name: "Swansea", lat: 51.6214, lon: -3.9436 },
  { name: "Aberdeen", lat: 57.1497, lon: -2.0943 },
  { name: "Dundee", lat: 56.462, lon: -2.9707 },
  { name: "Inverness", lat: 57.4778, lon: -4.2247 },
  // 20 additional cities with significant Muslim populations
  { name: "Rochdale", lat: 53.6097, lon: -2.1561 },
  { name: "Oldham", lat: 53.5409, lon: -2.1114 },
  { name: "Burnley", lat: 53.7893, lon: -2.2405 },
  { name: "Dewsbury", lat: 53.691, lon: -1.633 },
  { name: "Batley", lat: 53.7168, lon: -1.6356 },
  { name: "Nelson", lat: 53.8356, lon: -2.2197 },
  { name: "Halifax", lat: 53.727, lon: -1.8575 },
  { name: "Walsall", lat: 52.5862, lon: -1.9829 },
  { name: "Peterborough", lat: 52.5695, lon: -0.2405 },
  { name: "Blackpool", lat: 53.8175, lon: -3.0357 },
  { name: "Rotherham", lat: 53.4326, lon: -1.3635 },
  { name: "Doncaster", lat: 53.5228, lon: -1.1312 },
  { name: "Northampton", lat: 52.2405, lon: -0.9027 },
  { name: "Milton Keynes", lat: 52.0406, lon: -0.7594 },
  { name: "Crawley", lat: 51.1092, lon: -0.1872 },
  { name: "Croydon", lat: 51.3727, lon: -0.1099 },
  { name: "Hounslow", lat: 51.4746, lon: -0.358 },
  { name: "Harrow", lat: 51.5796, lon: -0.3338 },
  { name: "Keighley", lat: 53.8679, lon: -1.909 },
  { name: "Hyde", lat: 53.4513, lon: -2.0792 },
];

/** OSM cuisine → display label */
const CUISINE_MAP = {
  indian: "Indian",
  pakistani: "Pakistani",
  bangladeshi: "Bangladeshi",
  turkish: "Turkish",
  lebanese: "Lebanese",
  arab: "Arab",
  middle_eastern: "Middle Eastern",
  persian: "Persian",
  afghan: "Afghan",
  moroccan: "Moroccan",
  chinese: "Chinese",
  thai: "Thai",
  italian: "Italian",
  pizza: "Pizza",
  burger: "Burgers",
  kebab: "Kebab",
  fish_and_chips: "Fish and chips",
  chicken: "Chicken",
  fried_chicken: "Fried chicken",
  sandwich: "Sandwiches",
  seafood: "Seafood",
  steak_house: "Steakhouse",
  barbecue: "Barbecue",
  sushi: "Sushi",
  mexican: "Mexican",
  american: "American",
  british: "British",
  mediterranean: "Mediterranean",
  asian: "Asian",
  noodle: "Noodles",
  ramen: "Ramen",
  vegan: "Vegan",
  vegetarian: "Vegetarian",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Random 1–3 second jitter added on top of RETRY_DELAY_MS between retries. */
function retryJitterMs() {
  return 1000 + Math.floor(Math.random() * 2001);
}

function endpointLabel(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function mapCuisine(tags) {
  const raw = tags.cuisine || tags["cuisine:1"] || "";
  if (!raw) return null;
  const parts = raw.split(/[;,]/).map((p) => p.trim().toLowerCase());
  const labels = parts
    .map((p) => CUISINE_MAP[p] || p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
    .filter(Boolean);
  return labels.length ? labels.join(", ") : null;
}

function isUkCoord(lat, lon) {
  return (
    lat >= UK_LAT_MIN &&
    lat <= UK_LAT_MAX &&
    lon >= UK_LNG_MIN &&
    lon <= UK_LNG_MAX
  );
}

function dedupeKey(name, lat, lon) {
  return `${name}|${lat.toFixed(5)}|${lon.toFixed(5)}`;
}

function buildOverpassQuery(lat, lon) {
  return `[out:json][timeout:60];
(
  node["amenity"="restaurant"]["diet:halal"="yes"](around:${RADIUS_M},${lat},${lon});
  node["amenity"="fast_food"]["diet:halal"="yes"](around:${RADIUS_M},${lat},${lon});
  node["amenity"="restaurant"]["halal"="yes"](around:${RADIUS_M},${lat},${lon});
  node["amenity"="fast_food"]["halal"="yes"](around:${RADIUS_M},${lat},${lon});
);
out body;`;
}

/**
 * @param {string} url
 * @param {string} query
 * @returns {Promise<object[]>}
 */
async function postOverpass(url, query) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "halalresmenu-bot/1.0 (halal restaurant directory; contact@halalresmenu.com)",
    },
    body: new URLSearchParams({ data: query }).toString(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Overpass HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.elements ?? [];
}

/**
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<object[]>}
 */
async function fetchOverpassForCity(lat, lon) {
  const query = buildOverpassQuery(lat, lon);
  let lastError;

  for (let e = 0; e < OVERPASS_ENDPOINTS.length; e++) {
    const url = OVERPASS_ENDPOINTS[e];
    const label = endpointLabel(url);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await postOverpass(url, query);
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          const waitMs = RETRY_DELAY_MS + retryJitterMs();
          console.warn(
            `  ${label} attempt ${attempt} failed: ${err.message}. Retrying in ${(waitMs / 1000).toFixed(1)}s…`
          );
          await sleep(waitMs);
        }
      }
    }

    if (e < OVERPASS_ENDPOINTS.length - 1) {
      console.warn(
        `  ${label} failed after ${MAX_RETRIES} attempts. Trying next endpoint…`
      );
    }
  }

  throw lastError;
}

/**
 * @param {object} el
 * @returns {{ lat: number; lon: number; tags: Record<string, string> } | null}
 */
function parseElement(el) {
  if (el.type !== "node") return null;
  const tags = el.tags ?? {};
  const lat = el.lat;
  const lon = el.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return { lat, lon, tags };
}

function buildAddress(tags) {
  const parts = [];
  if (tags["addr:housenumber"]) parts.push(tags["addr:housenumber"]);
  if (tags["addr:street"]) parts.push(tags["addr:street"]);
  if (parts.length) return parts.join(" ");
  if (tags["addr:full"]) return tags["addr:full"];
  if (tags["addr:place"]) return tags["addr:place"];
  return null;
}

function isHalalCertified(tags) {
  return tags["diet:halal"] === "yes" || tags.halal === "yes";
}

/**
 * @param {object} params
 * @returns {object}
 */
function mapToRestaurantRow({ name, slug, city, lat, lon, tags }) {
  const cuisine = mapCuisine(tags);
  const cuisineLabel = cuisine || "restaurant";

  return {
    name,
    slug,
    description: `Halal ${cuisineLabel} restaurant in ${city}`,
    cuisine_type: cuisine,
    address: buildAddress(tags),
    city,
    country: "UK",
    latitude: lat,
    longitude: lon,
    phone: tags.phone || tags["contact:phone"] || null,
    website: tags.website || tags["contact:website"] || null,
    postcode: tags["addr:postcode"] || null,
  };
}

/**
 * @param {object[]} elements
 * @param {string} cityName
 * @param {Set<string>} globalSlugSet
 * @param {Set<string>} globalDedupeSet
 * @returns {object[]}
 */
function processElements(elements, cityName, globalSlugSet, globalDedupeSet) {
  const citySlug = slugify(cityName);
  const localSlugCounts = new Map();
  const rows = [];

  for (const el of elements) {
    const parsed = parseElement(el);
    if (!parsed) continue;

    const { lat, lon, tags } = parsed;
    const name = (tags.name || "").trim();
    if (!name) continue;

    if (!isUkCoord(lat, lon)) continue;

    const dKey = dedupeKey(name, lat, lon);
    if (globalDedupeSet.has(dKey)) continue;
    globalDedupeSet.add(dKey);

    let baseSlug = slugify(name);
    if (!baseSlug) continue;

    let slug = baseSlug;
    const count = (localSlugCounts.get(baseSlug) || 0) + 1;
    localSlugCounts.set(baseSlug, count);
    if (count > 1 || globalSlugSet.has(slug)) {
      slug = `${baseSlug}-${citySlug}`;
    }

    let suffix = 2;
    while (globalSlugSet.has(slug)) {
      slug = `${baseSlug}-${citySlug}-${suffix}`;
      suffix += 1;
    }
    globalSlugSet.add(slug);

    rows.push(
      mapToRestaurantRow({
        name,
        slug,
        city: cityName,
        lat,
        lon,
        tags,
      })
    );
  }

  return rows;
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  const key =
    serviceKey && serviceKey.length > 20 && !serviceKey.includes("your-")
      ? serviceKey
      : anonKey;

  if (key === serviceKey) {
    console.log("Using SUPABASE_SERVICE_ROLE_KEY for writes.");
  } else {
    console.log("Using anon key (set SUPABASE_SERVICE_ROLE_KEY if RLS blocks inserts).");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object[]} rows
 * @returns {Promise<number>}
 */
async function upsertBatches(supabase, rows) {
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("restaurants").upsert(batch, {
      onConflict: "slug",
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Upsert batch failed: ${error.message}`);
    }

    inserted += batch.length;
  }

  return inserted;
}

async function main() {
  const supabase = createSupabaseClient();
  const totalCities = UK_CITIES.length;
  const summary = {};
  const failedCities = [];
  const globalSlugSet = new Set();
  const globalDedupeSet = new Set();
  let grandTotal = 0;

  console.log(`Starting UK halal extract for ${totalCities} cities…\n`);

  for (let i = 0; i < UK_CITIES.length; i++) {
    const city = UK_CITIES[i];
    const index = i + 1;
    console.log(
      `Processing city ${index} of ${totalCities}: ${city.name}`
    );

    try {
      const elements = await fetchOverpassForCity(city.lat, city.lon);
      const rows = processElements(
        elements,
        city.name,
        globalSlugSet,
        globalDedupeSet
      );

      let cityInserted = 0;
      if (rows.length > 0) {
        cityInserted = await upsertBatches(supabase, rows);
      }

      summary[city.name] = {
        fetched: elements.length,
        prepared: rows.length,
        upserted: cityInserted,
      };
      grandTotal += cityInserted;

      console.log(`Inserted ${cityInserted} restaurants for ${city.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `Skipping ${city.name}: all Overpass endpoints failed — ${message}`
      );
      failedCities.push({ city: city.name, error: message });
      summary[city.name] = { error: message, skipped: true };
    }

    if (i < UK_CITIES.length - 1) {
      await sleep(CITY_DELAY_MS);
    }
  }

  const summaryPath = resolve(process.cwd(), "summary.json");
  const failedPath = resolve(process.cwd(), "failed-cities.json");

  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        completedAt: new Date().toISOString(),
        totalCities,
        grandTotal,
        perCity: summary,
        failedCount: failedCities.length,
      },
      null,
      2
    )
  );

  writeFileSync(failedPath, JSON.stringify(failedCities, null, 2));

  console.log(`\nSummary written to ${summaryPath}`);
  console.log(`Failed cities written to ${failedPath}`);
  console.log(`DONE: ${grandTotal} total restaurants inserted across UK`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
