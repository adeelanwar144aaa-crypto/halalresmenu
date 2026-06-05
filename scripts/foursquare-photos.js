/**
 * Foursquare place photos → Supabase Storage → restaurants.photos
 * Run: npm run foursquare-photos
 *
 * Env: FOURSQUARE_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Requires public bucket: restaurant-photos
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const API_DELAY_MS = 300;
const RESTAURANT_PAGE_SIZE = 100;
const FETCH_TIMEOUT_MS = 30000;
const MAX_PHOTOS = 3;
const STORAGE_BUCKET = "restaurant-photos";
const FSQ_SEARCH_URL = "https://api.foursquare.com/v3/places/search";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function needsNewPhotos(photos) {
  if (photos == null) return true;
  const text =
    typeof photos === "string" ? photos : JSON.stringify(photos);
  return text.toLowerCase().includes("googleapis");
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

function getFoursquareApiKey() {
  const key = process.env.FOURSQUARE_API_KEY?.trim();
  if (!key || key.includes("your-")) {
    throw new Error("Missing FOURSQUARE_API_KEY in .env.local");
  }
  return key;
}

/**
 * @param {string} apiKey
 * @param {string} pathWithQuery
 */
async function foursquareGet(apiKey, pathWithQuery) {
  const url = pathWithQuery.startsWith("http")
    ? pathWithQuery
    : `https://api.foursquare.com/v3${pathWithQuery}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: apiKey,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Foursquare HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  return res.json();
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function fetchRestaurantsNeedingPhotos(supabase) {
  const all = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, city, photos")
      .order("name", { ascending: true })
      .range(offset, offset + RESTAURANT_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`restaurants fetch: ${error.message}`);
    }

    if (!data?.length) break;

    for (const row of data) {
      if (needsNewPhotos(row.photos)) {
        all.push(row);
      }
    }

    if (data.length < RESTAURANT_PAGE_SIZE) break;
    offset += RESTAURANT_PAGE_SIZE;
  }

  return all;
}

/**
 * @param {string} apiKey
 * @param {string} name
 * @param {string | null} city
 */
async function searchFoursquarePlace(apiKey, name, city) {
  const near = city?.trim() ? `${city.trim()}, UK` : "UK";
  const params = new URLSearchParams({
    query: name.trim(),
    near,
    limit: "1",
  });

  const json = await foursquareGet(apiKey, `/places/search?${params.toString()}`);
  const results = json.results ?? [];
  return results[0] ?? null;
}

/**
 * @param {string} apiKey
 * @param {string} placeId
 */
async function fetchFoursquarePhotos(apiKey, placeId) {
  const params = new URLSearchParams({ limit: String(MAX_PHOTOS) });
  const json = await foursquareGet(
    apiKey,
    `/places/${encodeURIComponent(placeId)}/photos?${params.toString()}`
  );
  return Array.isArray(json) ? json : json.results ?? [];
}

/**
 * @param {object} photo
 */
function buildFoursquarePhotoUrl(photo) {
  const prefix = photo?.prefix;
  const suffix = photo?.suffix;
  if (!prefix || !suffix) return null;
  return `${prefix}original${suffix}`;
}

/**
 * @param {string} url
 */
async function downloadImage(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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
  const storagePath = `restaurant-photos/${slug}/photo-${index}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, image.buffer, {
      contentType: image.contentType.includes("png")
        ? "image/png"
        : "image/jpeg",
      upsert: true,
      cacheControl: "31536000",
    });

  if (uploadError) {
    throw new Error(`storage upload: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  if (!data?.publicUrl) {
    throw new Error("storage getPublicUrl returned no URL");
  }

  return data.publicUrl;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 * @param {string[]} photoUrls
 */
async function savePhotosColumn(supabase, id, photoUrls) {
  const { error } = await supabase
    .from("restaurants")
    .update({
      photos: photoUrls,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

async function main() {
  const supabase = createSupabaseClient();
  const apiKey = getFoursquareApiKey();

  const summary = {
    completedAt: null,
    processed: 0,
    saved: 0,
    skipped: 0,
    failed: 0,
    totalPhotosUploaded: 0,
    details: [],
  };

  console.log("Foursquare photos → Supabase Storage…\n");

  const restaurants = await fetchRestaurantsNeedingPhotos(supabase);
  const total = restaurants.length;
  console.log(
    `Restaurants needing photos (null or googleapis): ${total}\n`
  );

  if (total === 0) {
    summary.completedAt = new Date().toISOString();
    const summaryPath = resolve(process.cwd(), "summary-foursquare-photos.json");
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log("Nothing to process. Summary written.");
    return;
  }

  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i];
    const index = i + 1;
    summary.processed += 1;

    const slug = sanitizeSlug(restaurant.slug, restaurant.id);

    try {
      const place = await searchFoursquarePlace(
        apiKey,
        restaurant.name,
        restaurant.city
      );
      await sleep(API_DELAY_MS);

      if (!place?.fsq_id) {
        summary.skipped += 1;
        console.log(
          `[${index}/${total}] ${restaurant.name} - SKIP: no Foursquare match`
        );
        summary.details.push({
          name: restaurant.name,
          slug: restaurant.slug,
          status: "skipped",
          reason: "no_place_match",
        });
        await sleep(API_DELAY_MS);
        continue;
      }

      const photoMeta = await fetchFoursquarePhotos(apiKey, place.fsq_id);
      await sleep(API_DELAY_MS);

      const publicUrls = [];

      for (let p = 0; p < photoMeta.length && publicUrls.length < MAX_PHOTOS; p++) {
        const sourceUrl = buildFoursquarePhotoUrl(photoMeta[p]);
        if (!sourceUrl) continue;

        try {
          const image = await downloadImage(sourceUrl);
          await sleep(API_DELAY_MS);

          const publicUrl = await uploadToStorage(
            supabase,
            slug,
            publicUrls.length + 1,
            image
          );
          publicUrls.push(publicUrl);
          summary.totalPhotosUploaded += 1;
          await sleep(API_DELAY_MS);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.log(
            `  [${restaurant.name}] photo ${p + 1} failed: ${message}`
          );
        }
      }

      if (publicUrls.length === 0) {
        summary.skipped += 1;
        console.log(
          `[${index}/${total}] ${restaurant.name} - SKIP: no photos uploaded (${place.name ?? place.fsq_id})`
        );
        summary.details.push({
          name: restaurant.name,
          slug: restaurant.slug,
          status: "skipped",
          reason: "no_photos_uploaded",
          foursquareId: place.fsq_id,
          matchedName: place.name ?? null,
        });
      } else {
        await savePhotosColumn(supabase, restaurant.id, publicUrls);
        summary.saved += 1;
        console.log(
          `[${index}/${total}] ${restaurant.name} - OK: ${publicUrls.length} photos`
        );
        summary.details.push({
          name: restaurant.name,
          slug: restaurant.slug,
          status: "saved",
          photos: publicUrls.length,
          foursquareId: place.fsq_id,
          matchedName: place.name ?? null,
          urls: publicUrls,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.failed += 1;
      console.log(`[${index}/${total}] ${restaurant.name} - FAIL: ${message}`);
      summary.details.push({
        name: restaurant.name,
        slug: restaurant.slug,
        status: "failed",
        error: message,
      });
    }

    await sleep(API_DELAY_MS);
  }

  summary.completedAt = new Date().toISOString();
  const summaryPath = resolve(process.cwd(), "summary-foursquare-photos.json");
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log("\n========== Summary ==========");
  console.log(`Processed: ${summary.processed}`);
  console.log(`Saved: ${summary.saved}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Total photos uploaded: ${summary.totalPhotosUploaded}`);
  console.log(`Summary written to ${summaryPath}`);
  console.log("DONE.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
