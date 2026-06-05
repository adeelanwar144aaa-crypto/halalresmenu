/**
 * Google Places enrichment — existing restaurants + UK city discovery → Supabase.
 * Run migration scripts/migrations/add-google-places-columns.sql first.
 * Run: npm run enrich-google
 *
 * Requires GOOGLE_PLACES_API_KEY in .env.local
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");
const stringSimilarity = require("string-similarity");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const API_DELAY_MS = 300;
const NEXT_PAGE_TOKEN_DELAY_MS = 2000;
const FETCH_TIMEOUT_MS = 30000;
const RESTAURANT_PAGE_SIZE = 100;
const MAX_PHOTOS = 10;
const SIMILARITY_THRESHOLD = 0.45;

const PLACE_DETAILS_FIELDS = [
  "place_id",
  "name",
  "formatted_address",
  "formatted_phone_number",
  "website",
  "rating",
  "user_ratings_total",
  "reviews",
  "photos",
  "opening_hours",
  "geometry",
  "price_level",
  "business_status",
  "dine_in",
  "takeout",
  "delivery",
  "curbside_pickup",
  "reservable",
  "serves_breakfast",
  "serves_lunch",
  "serves_dinner",
  "wheelchair_accessible_entrance",
].join(",");

const SEARCH_TEMPLATES = [
  "halal restaurant",
  "halal takeaway",
  "halal buffet",
  "halal fast food",
  "halal cafe",
  "halal grill",
  "halal chicken",
  "halal kebab",
  "halal pizza",
  "halal curry",
];

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

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
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

function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\b(ltd|limited|restaurant|restaurants|uk)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractUkPostcode(address) {
  if (!address) return null;
  const match = String(address).match(
    /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i
  );
  return match ? match[1].toUpperCase().replace(/\s+/, " ") : null;
}

function formatGoogleTime(time) {
  const s = String(time).padStart(4, "0");
  return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
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
      "Using anon key (set SUPABASE_SERVICE_ROLE_KEY if RLS blocks writes)."
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function getGoogleApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key || key.includes("your-")) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY in .env.local");
  }
  return key;
}

/**
 * @param {string} pathAndQuery
 * @param {boolean} [isNextPage]
 */
async function googleApiGet(pathAndQuery, isNextPage = false) {
  await sleep(isNextPage ? NEXT_PAGE_TOKEN_DELAY_MS : API_DELAY_MS);
  const url = pathAndQuery.startsWith("http")
    ? pathAndQuery
    : `https://maps.googleapis.com/maps/api${pathAndQuery}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  return res.json();
}

/**
 * @param {string} apiKey
 * @param {string} query
 * @returns {Promise<object[]>}
 */
async function textSearchAll(apiKey, query) {
  const results = [];
  let pageToken = null;
  let page = 0;

  do {
    const params = new URLSearchParams({
      query,
      key: apiKey,
      region: "uk",
    });
    if (pageToken) {
      params.set("pagetoken", pageToken);
    }

    const data = await googleApiGet(
      `/place/textsearch/json?${params}`,
      Boolean(pageToken)
    );

    if (data.status === "ZERO_RESULTS") break;
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Text Search ${data.status}: ${data.error_message || ""}`);
    }

    if (Array.isArray(data.results)) {
      results.push(...data.results);
    }

    pageToken = data.next_page_token || null;
    page += 1;
  } while (pageToken && page < 3);

  return results;
}

/**
 * @param {string} apiKey
 * @param {string} placeId
 * @returns {Promise<object>}
 */
async function fetchPlaceDetails(apiKey, placeId) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: PLACE_DETAILS_FIELDS,
    key: apiKey,
  });

  const data = await googleApiGet(`/place/details/json?${params}`);

  if (data.status !== "OK") {
    throw new Error(
      `Place Details ${data.status}: ${data.error_message || placeId}`
    );
  }

  return data.result;
}

/**
 * @param {string} photoReference
 * @param {string} apiKey
 */
function buildPhotoUrl(photoReference, apiKey) {
  const params = new URLSearchParams({
    maxwidth: "800",
    photo_reference: photoReference,
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params}`;
}

/**
 * @param {object[] | undefined} photos
 * @param {string} apiKey
 * @returns {string[]}
 */
function mapPhotoUrls(photos, apiKey) {
  if (!Array.isArray(photos)) return [];
  return photos
    .slice(0, MAX_PHOTOS)
    .map((p) => p.photo_reference)
    .filter(Boolean)
    .map((ref) => buildPhotoUrl(ref, apiKey));
}

/**
 * @param {object[] | undefined} reviews
 */
function mapReviews(reviews) {
  if (!Array.isArray(reviews)) return [];
  return reviews.slice(0, 5).map((r) => ({
    author_name: r.author_name ?? null,
    rating: r.rating ?? null,
    text: r.text ?? null,
    time: r.time ?? null,
    profile_photo_url: r.profile_photo_url ?? null,
  }));
}

/**
 * @param {object | undefined} openingHours
 */
function mapOpeningHours(openingHours) {
  if (!openingHours) return null;

  /** @type {Record<string, { open: string | null; close: string | null; closed: boolean }>} */
  const byDay = {};
  for (const key of DAY_KEYS) {
    byDay[key] = { open: null, close: null, closed: true };
  }

  if (Array.isArray(openingHours.periods)) {
    for (const period of openingHours.periods) {
      const open = period.open;
      if (!open || typeof open.day !== "number") continue;
      const dayKey = DAY_KEYS[open.day];
      if (!dayKey) continue;

      const openTime = open.time != null ? formatGoogleTime(open.time) : null;
      const closeTime =
        period.close?.time != null ? formatGoogleTime(period.close.time) : null;

      byDay[dayKey] = {
        open: openTime,
        close: closeTime,
        closed: false,
      };
    }
  }

  return {
    ...byDay,
    weekday_text: openingHours.weekday_text ?? null,
    periods: openingHours.periods ?? null,
  };
}

/**
 * @param {object} details
 * @param {string} apiKey
 * @param {{ city?: string; slug?: string }} [ctx]
 */
function mapDetailsToPayload(details, apiKey, ctx = {}) {
  const lat = details.geometry?.location?.lat;
  const lon = details.geometry?.location?.lng;
  const photos = mapPhotoUrls(details.photos, apiKey);
  const reviews = mapReviews(details.reviews);
  const openingHours = mapOpeningHours(details.opening_hours);
  const now = new Date().toISOString();

  const dineIn = details.dine_in ?? null;
  const takeaway = details.takeout ?? null;
  const delivery = details.delivery ?? null;
  const curbsidePickup = details.curbside_pickup ?? null;
  const reservable = details.reservable ?? null;
  const outdoorSeating = details.outdoor_seating ?? null;

  return {
    name: details.name ?? ctx.fallbackName ?? null,
    google_place_id: details.place_id ?? null,
    address: details.formatted_address ?? null,
    postcode: extractUkPostcode(details.formatted_address),
    phone: details.formatted_phone_number ?? null,
    website: details.website ?? null,
    latitude: typeof lat === "number" ? lat : null,
    longitude: typeof lon === "number" ? lon : null,
    rating: details.rating ?? null,
    total_reviews: details.user_ratings_total ?? null,
    reviews,
    photos,
    opening_hours: openingHours,
    price_level: details.price_level ?? null,
    business_status: details.business_status ?? null,
    dine_in: dineIn,
    takeaway,
    delivery,
    curbside_pickup: curbsidePickup,
    outdoor_seating: outdoorSeating,
    reservable,
    serves_breakfast: details.serves_breakfast ?? null,
    serves_lunch: details.serves_lunch ?? null,
    serves_dinner: details.serves_dinner ?? null,
    wheelchair_accessible: details.wheelchair_accessible_entrance ?? null,
    dine_in_available: dineIn,
    takeaway_available: takeaway,
    has_takeaway: takeaway,
    delivery_available: delivery,
    has_delivery: delivery,
    reservation_available: reservable,
    is_temporarily_closed: details.business_status === "CLOSED_TEMPORARILY",
    is_active: details.business_status !== "CLOSED_PERMANENTLY",
    updated_at: now,
    ...(ctx.city ? { city: ctx.city } : {}),
    ...(ctx.slug ? { slug: ctx.slug } : {}),
    ...(ctx.country ? { country: ctx.country } : {}),
    ...(ctx.description ? { description: ctx.description } : {}),
  };
}

/**
 * @param {object[]} results
 * @param {string} targetName
 */
function pickBestPlaceResult(results, targetName) {
  if (!results.length) return null;
  const normalizedTarget = normalizeName(targetName);
  if (!normalizedTarget) return results[0];

  let best = results[0];
  let bestScore = 0;

  for (const r of results) {
    const score = stringSimilarity.compareTwoStrings(
      normalizedTarget,
      normalizeName(r.name || "")
    );
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  return bestScore >= SIMILARITY_THRESHOLD ? best : results[0];
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function fetchAllRestaurants(supabase) {
  const all = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, city, google_place_id, latitude, longitude")
      .order("id", { ascending: true })
      .range(offset, offset + RESTAURANT_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`restaurants fetch: ${error.message}`);
    }

    if (!data?.length) break;
    all.push(...data);
    if (data.length < RESTAURANT_PAGE_SIZE) break;
    offset += RESTAURANT_PAGE_SIZE;
  }

  return all;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function fetchKnownPlaceIds(supabase) {
  const ids = new Set();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("google_place_id")
      .not("google_place_id", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + RESTAURANT_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`google_place_id fetch: ${error.message}`);
    }

    if (!data?.length) break;
    for (const row of data) {
      if (row.google_place_id) ids.add(row.google_place_id);
    }
    if (data.length < RESTAURANT_PAGE_SIZE) break;
    offset += RESTAURANT_PAGE_SIZE;
  }

  return ids;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 * @param {object} payload
 * @param {object} stats
 */
async function updateRestaurant(supabase, id, payload, stats) {
  const { error } = await supabase.from("restaurants").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  stats.updated += 1;
  stats.photosCollected += Array.isArray(payload.photos) ? payload.photos.length : 0;
  stats.reviewsCollected += Array.isArray(payload.reviews)
    ? payload.reviews.length
    : 0;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} row
 * @param {object} stats
 * @param {Set<string>} globalSlugSet
 */
async function insertRestaurant(supabase, row, stats, globalSlugSet) {
  let slug = row.slug;
  if (!slug) {
    slug = slugify(row.name || "restaurant");
  }

  const citySlug = slugify(row.city || "uk");
  let candidate = slug;
  let suffix = 2;
  while (globalSlugSet.has(candidate)) {
    candidate = `${slug}-${citySlug}-${suffix}`;
    suffix += 1;
  }
  globalSlugSet.add(candidate);

  const insertRow = {
    ...row,
    slug: candidate,
    country: row.country || "UK",
    description:
      row.description ||
      `Halal restaurant in ${row.city || "the UK"}`,
    language: "en",
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };

  const { error } = await supabase.from("restaurants").insert(insertRow);
  if (error) {
    throw new Error(error.message);
  }

  stats.added += 1;
  stats.photosCollected += Array.isArray(insertRow.photos)
    ? insertRow.photos.length
    : 0;
  stats.reviewsCollected += Array.isArray(insertRow.reviews)
    ? insertRow.reviews.length
    : 0;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object[]} restaurants
 * @param {string} apiKey
 * @param {object} stats
 */
async function enrichExistingRestaurants(supabase, restaurants, apiKey, stats) {
  console.log(`\n--- Phase 1: Enrich ${restaurants.length} existing restaurants ---\n`);

  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i];
    const label = `${restaurant.name} (${restaurant.city || "unknown city"})`;
    console.log(
      `[${i + 1}/${restaurants.length}] ${label}`
    );

    try {
      let placeId = restaurant.google_place_id?.trim() || null;

      if (!placeId) {
        const query = [restaurant.name, restaurant.city, "UK"]
          .filter(Boolean)
          .join(" ");
        const searchResults = await textSearchAll(apiKey, query);
        const match = pickBestPlaceResult(searchResults, restaurant.name);
        if (!match?.place_id) {
          stats.existingFailed += 1;
          console.log(`  FAIL: no Google match for "${query}"`);
          continue;
        }
        placeId = match.place_id;
      }

      const details = await fetchPlaceDetails(apiKey, placeId);
      const payload = mapDetailsToPayload(details, apiKey, {
        city: restaurant.city,
        slug: restaurant.slug,
        fallbackName: restaurant.name,
      });

      await updateRestaurant(supabase, restaurant.id, payload, stats);
      stats.existingSuccess += 1;
      console.log(
        `  OK: place_id=${placeId}, rating=${payload.rating ?? "n/a"}, photos=${payload.photos.length}, reviews=${payload.reviews.length}`
      );
    } catch (err) {
      stats.existingFailed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  FAIL: ${message}`);
    }
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} apiKey
 * @param {Set<string>} knownPlaceIds
 * @param {Set<string>} globalSlugSet
 * @param {object} stats
 */
async function discoverNewRestaurants(
  supabase,
  apiKey,
  knownPlaceIds,
  globalSlugSet,
  stats
) {
  console.log(
    `\n--- Phase 2: Discover new restaurants (${UK_CITIES.length} cities × ${SEARCH_TEMPLATES.length} queries) ---\n`
  );

  const sessionPlaceIds = new Set(knownPlaceIds);

  for (const city of UK_CITIES) {
    let cityFound = 0;
    let cityAdded = 0;
    let cityFailed = 0;

    for (const template of SEARCH_TEMPLATES) {
      const query = `${template} ${city.name}`;
      try {
        const results = await textSearchAll(apiKey, query);

        for (const result of results) {
          const placeId = result.place_id;
          if (!placeId || sessionPlaceIds.has(placeId)) continue;

          sessionPlaceIds.add(placeId);
          cityFound += 1;

          try {
            const details = await fetchPlaceDetails(apiKey, placeId);
            const baseSlug = slugify(details.name || result.name || "restaurant");
            const row = mapDetailsToPayload(details, apiKey, {
              city: city.name,
              slug: baseSlug,
              country: "UK",
              description: `Halal restaurant in ${city.name}`,
              fallbackName: result.name,
            });

            await insertRestaurant(supabase, row, stats, globalSlugSet);
            cityAdded += 1;
          } catch (err) {
            cityFailed += 1;
            sessionPlaceIds.delete(placeId);
            const message = err instanceof Error ? err.message : String(err);
            console.log(`  FAIL insert ${placeId}: ${message}`);
          }
        }
      } catch (err) {
        cityFailed += 1;
        const message = err instanceof Error ? err.message : String(err);
        console.log(`  FAIL search "${query}": ${message}`);
      }
    }

    const status =
      cityFailed > 0 && cityAdded === 0
        ? "fail"
        : cityAdded > 0
          ? "success"
          : cityFound > 0
            ? "partial"
            : "no-new";

    console.log(
      `${city.name}: found ${cityFound} new place(s), added ${cityAdded}, failed ${cityFailed} — ${status}`
    );

    stats.cityLog.push({
      city: city.name,
      found: cityFound,
      added: cityAdded,
      failed: cityFailed,
      status,
    });
  }
}

async function main() {
  const apiKey = getGoogleApiKey();
  const supabase = createSupabaseClient();

  console.log("Google Places enrichment starting…");
  console.log(
    "Ensure scripts/migrations/add-google-places-columns.sql has been applied.\n"
  );

  const stats = {
    updated: 0,
    added: 0,
    photosCollected: 0,
    reviewsCollected: 0,
    existingSuccess: 0,
    existingFailed: 0,
    cityLog: [],
  };

  const restaurants = await fetchAllRestaurants(supabase);
  console.log(`Loaded ${restaurants.length} restaurants from Supabase.`);

  const globalSlugSet = new Set(
    restaurants.map((r) => r.slug).filter(Boolean)
  );

  await enrichExistingRestaurants(supabase, restaurants, apiKey, stats);

  const knownPlaceIds = await fetchKnownPlaceIds(supabase);
  await discoverNewRestaurants(
    supabase,
    apiKey,
    knownPlaceIds,
    globalSlugSet,
    stats
  );

  const summaryPath = resolve(process.cwd(), "summary-google-places.json");
  const summary = {
    completedAt: new Date().toISOString(),
    citiesSearched: UK_CITIES.length,
    searchQueriesPerCity: SEARCH_TEMPLATES.length,
    existingRestaurantsProcessed: restaurants.length,
    existingSuccess: stats.existingSuccess,
    existingFailed: stats.existingFailed,
    totalRestaurantsUpdated: stats.updated,
    totalNewRestaurantsAdded: stats.added,
    totalPhotosCollected: stats.photosCollected,
    totalReviewsCollected: stats.reviewsCollected,
    cityLog: stats.cityLog,
  };

  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log("\n========== Google Places summary ==========");
  console.log(`Total restaurants updated: ${stats.updated}`);
  console.log(`Total new restaurants added: ${stats.added}`);
  console.log(`Total photos collected: ${stats.photosCollected}`);
  console.log(`Total reviews collected: ${stats.reviewsCollected}`);
  console.log(`Existing enrich success: ${stats.existingSuccess}`);
  console.log(`Existing enrich failed: ${stats.existingFailed}`);
  console.log(`Summary written to ${summaryPath}`);
  console.log("DONE.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
