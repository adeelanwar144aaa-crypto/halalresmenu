/**
 * UK halal restaurant extractor — Foursquare Places API → Supabase.
 * Run: npm run extract-fsq
 *
 * Set FOURSQUARE_API_KEY in .env.local (Places API v3 Authorization value).
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const FSQ_TEST_URL =
  "https://api.foursquare.com/v3/places/search?query=restaurant&ll=51.5074,-0.1278&limit=1";
const FSQ_SEARCH_URL = "https://api.foursquare.com/v3/places/search";
const RADIUS_M = 15000;
const BATCH_SIZE = 50;
const CITY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 60000;

/**
 * Single-request smoke test for Foursquare Places API (raw Authorization key, no Bearer).
 * Run: node scripts/extract-foursquare-halal.js --test
 */
async function testFoursquareApiKey() {
  const authKey = "I2MHSROSGICFUEU01T2HGEGVFTETRFFLQQSNHG0FZQLLWYQD";

  console.log("Foursquare API test request");
  console.log("URL:", FSQ_TEST_URL);
  console.log("Authorization: [key set, length %d]", authKey.length);

  const res = await fetch(FSQ_TEST_URL, {
    method: "GET",
    headers: {
      Authorization: authKey,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const body = await res.text();

  console.log("\n--- Response ---");
  console.log("Status:", res.status, res.statusText);
  console.log("Body:");
  console.log(body);

  process.exit(res.ok ? 0 : 1);
}

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

function dedupeKey(name, lat, lon) {
  return `${name}|${lat.toFixed(5)}|${lon.toFixed(5)}`;
}

function getFoursquareApiKey() {
  const key = process.env.FOURSQUARE_API_KEY?.trim();
  if (!key || key.includes("your-")) {
    throw new Error(
      "Missing FOURSQUARE_API_KEY in .env.local (Foursquare Places API v3 Authorization value)"
    );
  }
  return key;
}

/**
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<object[]>}
 */
async function fetchFoursquarePlaces(lat, lon) {
  const params = new URLSearchParams({
    query: "halal restaurant",
    ll: `${lat},${lon}`,
    radius: String(RADIUS_M),
    limit: "50",
    fields:
      "name,location,geocodes,tel,website,rating,price,hours,categories",
  });

  const res = await fetch(`${FSQ_SEARCH_URL}?${params}`, {
    method: "GET",
    headers: {
      Authorization: process.env.FOURSQUARE_API_KEY,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Foursquare HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.results ?? [];
}

/**
 * @param {object} place
 * @param {string} cityName
 * @returns {object | null}
 */
function mapPlaceToRow(place, cityName) {
  const name = (place.name || "").trim();
  if (!name) return null;

  const lat = place.geocodes?.main?.latitude;
  const lon = place.geocodes?.main?.longitude;
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  return {
    name,
    slug: "",
    description: `Halal restaurant in ${cityName}`,
    cuisine_type: place.categories?.[0]?.name ?? null,
    address: place.location?.address ?? null,
    city: cityName,
    country: "UK",
    postcode: place.location?.postcode ?? null,
    latitude: lat,
    longitude: lon,
    phone: place.tel ?? null,
    website: place.website ?? null,
    _lat: lat,
    _lon: lon,
  };
}

/**
 * @param {object[]} places
 * @param {string} cityName
 * @param {Set<string>} globalSlugSet
 * @param {Set<string>} globalDedupeSet
 * @returns {object[]}
 */
function processPlaces(places, cityName, globalSlugSet, globalDedupeSet) {
  const citySlug = slugify(cityName);
  const localSlugCounts = new Map();
  const rows = [];

  for (const place of places) {
    const draft = mapPlaceToRow(place, cityName);
    if (!draft) continue;

    const { name, _lat: lat, _lon: lon } = draft;
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

    delete draft._lat;
    delete draft._lon;
    draft.slug = slug;
    rows.push(draft);
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
    console.log(
      "Using anon key (set SUPABASE_SERVICE_ROLE_KEY if RLS blocks inserts)."
    );
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
  getFoursquareApiKey();
  const supabase = createSupabaseClient();
  const totalCities = UK_CITIES.length;
  const failedCities = [];
  const globalSlugSet = new Set();
  const globalDedupeSet = new Set();
  let grandTotal = 0;

  console.log(
    `Starting Foursquare UK halal extract for ${totalCities} cities…\n`
  );

  for (let i = 0; i < UK_CITIES.length; i++) {
    const city = UK_CITIES[i];
    const index = i + 1;
    console.log(`Processing city ${index} of ${totalCities}: ${city.name}`);

    try {
      const places = await fetchFoursquarePlaces(city.lat, city.lon);
      const rows = processPlaces(
        places,
        city.name,
        globalSlugSet,
        globalDedupeSet
      );

      let cityInserted = 0;
      if (rows.length > 0) {
        cityInserted = await upsertBatches(supabase, rows);
      }

      grandTotal += cityInserted;
      console.log(`Inserted ${cityInserted} restaurants for ${city.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error for ${city.name}: ${message}`);
      failedCities.push({ city: city.name, error: message });
    }

    if (i < UK_CITIES.length - 1) {
      await sleep(CITY_DELAY_MS);
    }
  }

  if (failedCities.length > 0) {
    writeFileSync(
      resolve(process.cwd(), "failed-cities-fsq.json"),
      JSON.stringify(failedCities, null, 2)
    );
  }

  console.log(`DONE: ${grandTotal} total restaurants inserted across UK`);
}

if (process.argv.includes("--test")) {
  testFoursquareApiKey().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
