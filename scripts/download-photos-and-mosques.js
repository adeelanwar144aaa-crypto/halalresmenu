/**
 * Mosques only: one Nearby Search per city → nearby_mosques on all restaurants in city.
 * (Part 1 photos is disabled — run foursquare-photos / other scripts for images.)
 * Run: npm run download-photos-mosques
 *
 * Env: GOOGLE_PLACES_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 * Requires public bucket: restaurant-photos
 * Run scripts/migrations/add-nearby-mosques-column.sql first (or script will prompt).
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const API_DELAY_MS = 200;
const RESTAURANT_PAGE_SIZE = 100;
const FETCH_TIMEOUT_MS = 30000;
const MAX_PHOTOS = 3;
const MAX_MOSQUES_PER_CITY = 10;
const MOSQUE_CITY_RADIUS_M = 5000;
const MOSQUE_UPDATE_BATCH_SIZE = 100;
const STORAGE_BUCKET = "restaurant-photos";

/** @type {{ name: string; lat: number; lon: number }[]} */
const UK_CITY_CENTERS = [
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

function normalizeCityKey(city) {
  return String(city || "")
    .trim()
    .toLowerCase();
}

const CITY_CENTER_LOOKUP = new Map(
  UK_CITY_CENTERS.map((c) => [normalizeCityKey(c.name), { lat: c.lat, lng: c.lon }])
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hasGooglePhotos(photos) {
  if (photos == null) return false;
  const text =
    typeof photos === "string" ? photos : JSON.stringify(photos);
  return text.toLowerCase().includes("googleapis");
}

/**
 * Photo URLs already stored on restaurants.photos (no API fetch).
 * @param {unknown} photos
 * @returns {string[]}
 */
function getStoredGooglePhotoUrls(photos) {
  if (photos == null) return [];

  let arr = photos;
  if (typeof photos === "string") {
    try {
      arr = JSON.parse(photos);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(arr)) return [];

  return arr
    .filter((u) => typeof u === "string" && u.toLowerCase().includes("googleapis"))
    .slice(0, MAX_PHOTOS);
}

function sanitizeSlug(slug, fallbackId) {
  const base = String(slug || fallbackId || "restaurant")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "restaurant";
}

/**
 * Strip any existing key and append current GOOGLE_PLACES_API_KEY (photo fetch only).
 * @param {string} photoUrl
 */
function buildPhotoFetchUrl(photoUrl) {
  const cleanUrl = photoUrl.trim().split("&key=")[0];
  return cleanUrl + "&key=" + process.env.GOOGLE_PLACES_API_KEY;
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  }
  if (!serviceKey || serviceKey.includes("your-")) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  console.log("Using SUPABASE_SERVICE_ROLE_KEY for DB + storage writes.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function getGoogleApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key || key.includes("your-")) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY in .env.local");
  }
  return key;
}

/**
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in meters
 */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function ensureNearbyMosquesColumn(supabase) {
  const { error } = await supabase
    .from("restaurants")
    .select("nearby_mosques")
    .limit(1);

  if (!error) return;

  if (
    error.message.includes("nearby_mosques") ||
    error.message.includes("schema cache") ||
    error.code === "42703"
  ) {
    throw new Error(
      "Column nearby_mosques is missing. Run scripts/migrations/add-nearby-mosques-column.sql in the Supabase SQL editor, then re-run this script."
    );
  }

  throw new Error(`nearby_mosques check: ${error.message}`);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function fetchRestaurantsWithGooglePhotos(supabase) {
  const all = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, photos")
      .order("name", { ascending: true })
      .range(offset, offset + RESTAURANT_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`restaurants fetch (photos): ${error.message}`);
    }

    if (!data?.length) break;

    for (const row of data) {
      if (hasGooglePhotos(row.photos)) {
        all.push(row);
      }
    }

    if (data.length < RESTAURANT_PAGE_SIZE) break;
    offset += RESTAURANT_PAGE_SIZE;
  }

  return all;
}

/**
 * All restaurants (grouped by unique city in Part 2).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function fetchAllRestaurantsForMosques(supabase) {
  const all = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, city, latitude, longitude")
      .order("city", { ascending: true })
      .range(offset, offset + RESTAURANT_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`restaurants fetch (mosques): ${error.message}`);
    }

    if (!data?.length) break;
    all.push(...data);

    if (data.length < RESTAURANT_PAGE_SIZE) break;
    offset += RESTAURANT_PAGE_SIZE;
  }

  return all;
}

/**
 * @param {object[]} restaurants
 * @returns {Map<string, object[]>}
 */
function groupRestaurantsByCity(restaurants) {
  /** @type {Map<string, object[]>} */
  const groups = new Map();

  for (const restaurant of restaurants) {
    const city = String(restaurant.city || "Unknown").trim() || "Unknown";
    if (!groups.has(city)) {
      groups.set(city, []);
    }
    groups.get(city).push(restaurant);
  }

  return groups;
}

/**
 * @param {string} city
 * @param {object[]} restaurantsInCity
 * @returns {{ lat: number; lng: number } | null}
 */
function getCityCenter(city, restaurantsInCity) {
  const known = CITY_CENTER_LOOKUP.get(normalizeCityKey(city));
  if (known) return known;

  const withCoords = restaurantsInCity.filter(
    (r) =>
      typeof r.latitude === "number" && typeof r.longitude === "number"
  );

  if (withCoords.length === 0) return null;

  const lat =
    withCoords.reduce((sum, r) => sum + r.latitude, 0) / withCoords.length;
  const lng =
    withCoords.reduce((sum, r) => sum + r.longitude, 0) / withCoords.length;

  return { lat, lng };
}

/**
 * @param {string} url
 */
async function downloadImage(url) {
  console.log("Fetching:", url);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`download HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} slug
 * @param {number} index
 * @param {{ buffer: Buffer; contentType: string }} image
 */
async function uploadToStorage(supabase, slug, index, image) {
  const filePath = `restaurant-photos/${slug}/photo-${index}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, image.buffer, {
      contentType: image.contentType.includes("png")
        ? "image/png"
        : "image/jpeg",
      upsert: true,
      cacheControl: "31536000",
    });

  if (uploadError) {
    throw new Error(`storage upload: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  if (!publicUrl) {
    throw new Error(`getPublicUrl returned no URL for ${filePath}`);
  }

  return publicUrl;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ id: string }} restaurant
 * @param {string[]} photoUrls
 */
async function savePhotosToDatabase(supabase, restaurant, photoUrls) {
  const { data, error } = await supabase
    .from("restaurants")
    .update({
      photos: photoUrls,
      updated_at: new Date().toISOString(),
    })
    .eq("id", restaurant.id)
    .select("id, photos");

  if (error) {
    throw new Error(`photos update: ${error.message}`);
  }

  if (!data?.length) {
    throw new Error(
      `photos update: no row matched id=${restaurant.id}`
    );
  }

  console.log("Saved URLs:", photoUrls);
  return data[0];
}

/**
 * @param {string} apiKey
 * @param {number} lat
 * @param {number} lng
 */
async function fetchNearbyMosquesForCity(apiKey, lat, lng) {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(MOSQUE_CITY_RADIUS_M),
    type: "mosque",
    key: apiKey,
  });

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Nearby HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();

  if (data.status === "ZERO_RESULTS") {
    return [];
  }

  if (data.status !== "OK") {
    throw new Error(
      `Nearby Search ${data.status}: ${data.error_message || ""}`
    );
  }

  return Array.isArray(data.results) ? data.results : [];
}

/**
 * @param {object[]} results
 * @param {number} originLat
 * @param {number} originLng
 */
function mapMosquesWithDistance(results, originLat, originLng) {
  const mapped = results
    .map((place) => {
      const lat = place.geometry?.location?.lat;
      const lng = place.geometry?.location?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      const distance = Math.round(
        haversineMeters(originLat, originLng, lat, lng)
      );

      return {
        name: place.name ?? null,
        address: place.vicinity ?? place.formatted_address ?? null,
        lat,
        lng,
        distance,
      };
    })
    .filter(Boolean);

  mapped.sort((a, b) => a.distance - b.distance);
  return mapped.slice(0, MAX_MOSQUES_PER_CITY);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} restaurantIds
 * @param {object[]} mosques
 */
async function saveMosquesForCityRestaurants(supabase, restaurantIds, mosques) {
  const now = new Date().toISOString();
  const payload = {
    nearby_mosques: mosques,
    updated_at: now,
  };

  for (let i = 0; i < restaurantIds.length; i += MOSQUE_UPDATE_BATCH_SIZE) {
    const batchIds = restaurantIds.slice(i, i + MOSQUE_UPDATE_BATCH_SIZE);
    const { error } = await supabase
      .from("restaurants")
      .update(payload)
      .in("id", batchIds);

    if (error) {
      throw new Error(
        `mosques batch update (${i}-${i + batchIds.length}): ${error.message}`
      );
    }
  }
}

/**
 * Part 1: DB googleapis URLs → fetch image → Supabase storage → save public URLs.
 * Does not call Place Details or any other Google Places endpoint.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object[]} restaurants
 * @param {object} stats
 */
async function downloadRestaurantPhotos(supabase, restaurants, stats) {
  console.log(
    `\n--- Part 1: Stored Google photo URLs → Supabase (${restaurants.length} restaurants) ---`
  );
  console.log(
    "No Place Details API — using photos column URLs from database only.\n"
  );

  const total = restaurants.length;

  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i];
    const index = i + 1;
    const slug = sanitizeSlug(restaurant.slug, restaurant.id);
    const storedUrls = getStoredGooglePhotoUrls(restaurant.photos);

    stats.photos.processed += 1;

    if (storedUrls.length === 0) {
      stats.photos.skipped += 1;
      console.log(
        `[${index}/${total}] ${restaurant.name} - SKIP: no googleapis URLs in photos`
      );
      await sleep(API_DELAY_MS);
      continue;
    }

    const supabasePhotoUrls = [];
    const firstFinalUrl = buildPhotoFetchUrl(storedUrls[0]);
    console.log("First photo URL:", firstFinalUrl);

    try {
      for (let p = 0; p < storedUrls.length; p++) {
        const finalUrl = buildPhotoFetchUrl(storedUrls[p]);
        await sleep(API_DELAY_MS);

        try {
          const image = await downloadImage(finalUrl);
          await sleep(API_DELAY_MS);

          const publicUrl = await uploadToStorage(
            supabase,
            slug,
            p + 1,
            image
          );
          supabasePhotoUrls.push(publicUrl);
          stats.totalPhotosDownloaded += 1;
          await sleep(API_DELAY_MS);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.log(
            `  [${restaurant.name}] photo ${p + 1} failed: ${message}`
          );
          await sleep(API_DELAY_MS);
        }
      }

      // Save permanent Supabase URLs after all download/upload attempts finish
      if (supabasePhotoUrls.length === 0) {
        stats.photos.skipped += 1;
        console.log(
          `[${index}/${total}] ${restaurant.name} - SKIP: no photos uploaded`
        );
      } else {
        await savePhotosToDatabase(supabase, restaurant, supabasePhotoUrls);
        stats.photos.saved += 1;
        console.log(
          `[${index}/${total}] ${restaurant.name} - OK: ${supabasePhotoUrls.length} photos saved to DB`
        );
      }
    } catch (err) {
      stats.photos.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[${index}/${total}] ${restaurant.name} - FAIL: ${message}`);
    }

    await sleep(API_DELAY_MS);
  }
}

/**
 * Part 2: One Nearby Search per city → same mosque list for all restaurants in city.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object[]} restaurants
 * @param {string} apiKey
 * @param {object} stats
 */
async function storeNearbyMosquesByCity(supabase, restaurants, apiKey, stats) {
  const byCity = groupRestaurantsByCity(restaurants);
  const cities = [...byCity.keys()].sort((a, b) => a.localeCompare(b));
  const totalCities = cities.length;

  console.log(
    `\n--- Nearby mosques by city (${totalCities} unique cities, ${restaurants.length} restaurants) ---`
  );
  console.log(
    `One API call per city (radius ${MOSQUE_CITY_RADIUS_M}m, up to ${MAX_MOSQUES_PER_CITY} mosques).\n`
  );

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const cityRestaurants = byCity.get(city);
    const index = i + 1;
    const center = getCityCenter(city, cityRestaurants);

    if (!center) {
      stats.mosques.citiesSkipped += 1;
      stats.mosques.restaurantsSkipped += cityRestaurants.length;
      console.log(
        `[${index}/${totalCities}] ${city} - SKIP: no city center coordinates`
      );
      await sleep(API_DELAY_MS);
      continue;
    }

    try {
      await sleep(API_DELAY_MS);
      const results = await fetchNearbyMosquesForCity(
        apiKey,
        center.lat,
        center.lng
      );
      await sleep(API_DELAY_MS);

      const mosques = mapMosquesWithDistance(
        results,
        center.lat,
        center.lng
      );
      const restaurantIds = cityRestaurants.map((r) => r.id);

      await saveMosquesForCityRestaurants(supabase, restaurantIds, mosques);

      stats.mosques.apiCalls += 1;
      stats.mosques.citiesSaved += 1;
      stats.mosques.restaurantsUpdated += cityRestaurants.length;

      if (mosques.length > 0) {
        stats.totalRestaurantsWithMosquesSaved += cityRestaurants.length;
      }

      console.log(
        `[${index}/${totalCities}] ${city} - OK: ${mosques.length} mosques found`
      );
    } catch (err) {
      stats.mosques.citiesFailed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[${index}/${totalCities}] ${city} - FAIL: ${message}`);
    }

    await sleep(API_DELAY_MS);
  }
}

async function main() {
  console.log("API Key loaded:", !!process.env.GOOGLE_PLACES_API_KEY);

  const apiKey = getGoogleApiKey();
  const supabase = createSupabaseClient();

  const stats = {
    totalRestaurantsWithMosquesSaved: 0,
    mosques: {
      apiCalls: 0,
      citiesSaved: 0,
      citiesSkipped: 0,
      citiesFailed: 0,
      restaurantsUpdated: 0,
      restaurantsSkipped: 0,
    },
  };

  console.log("Mosques by city (Part 1 photos skipped)…\n");

  await ensureNearbyMosquesColumn(supabase);

  const restaurants = await fetchAllRestaurantsForMosques(supabase);
  const uniqueCities = new Set(
    restaurants.map((r) => String(r.city || "Unknown").trim() || "Unknown")
  );
  console.log(
    `Loaded ${restaurants.length} restaurants across ${uniqueCities.size} unique cities.\n`
  );

  await storeNearbyMosquesByCity(supabase, restaurants, apiKey, stats);

  const summary = {
    completedAt: new Date().toISOString(),
    uniqueCities: uniqueCities.size,
    totalRestaurantsWithMosquesSaved: stats.totalRestaurantsWithMosquesSaved,
    mosques: stats.mosques,
  };

  const summaryPath = resolve(process.cwd(), "summary-final.json");
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log("\n========== Final summary ==========");
  console.log(`Unique cities: ${uniqueCities.size}`);
  console.log(
    `Total restaurants with mosques saved: ${stats.totalRestaurantsWithMosquesSaved}`
  );
  console.log(
    `Mosques — API calls: ${stats.mosques.apiCalls}, cities saved: ${stats.mosques.citiesSaved}, cities failed: ${stats.mosques.citiesFailed}, restaurants updated: ${stats.mosques.restaurantsUpdated}`
  );
  console.log(`Summary written to ${summaryPath}`);
  console.log("DONE.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
