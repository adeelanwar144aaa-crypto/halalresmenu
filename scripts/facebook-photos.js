/**
 * Fetch Facebook place photos for restaurants with missing or Google photos.
 * Run: npm run facebook-photos
 *
 * Env: FACEBOOK_ACCESS_TOKEN, Supabase keys in .env.local
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");
const stringSimilarity = require("string-similarity");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const API_DELAY_MS = 300;
const RESTAURANT_PAGE_SIZE = 100;
const FETCH_TIMEOUT_MS = 30000;
const MAX_PHOTOS_SAVE = 5;
const SIMILARITY_THRESHOLD = 0.45;
const FB_API_VERSION = "v19.0";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

function needsFacebookPhotos(photos) {
  if (photos == null) return true;
  const text =
    typeof photos === "string" ? photos : JSON.stringify(photos);
  return text.toLowerCase().includes("googleapis");
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
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

  console.log(
    key === serviceKey
      ? "Using SUPABASE_SERVICE_ROLE_KEY for writes."
      : "Using anon key (set SUPABASE_SERVICE_ROLE_KEY if RLS blocks writes)."
  );

  return createClient(url, key, { auth: { persistSession: false } });
}

function getFacebookAccessToken() {
  const token = process.env.FACEBOOK_ACCESS_TOKEN?.trim();
  if (!token || token.includes("your-")) {
    throw new Error("Missing FACEBOOK_ACCESS_TOKEN in .env.local");
  }
  return token;
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
      if (needsFacebookPhotos(row.photos)) {
        all.push(row);
      }
    }

    if (data.length < RESTAURANT_PAGE_SIZE) break;
    offset += RESTAURANT_PAGE_SIZE;
  }

  return all;
}

/**
 * @param {object} place
 * @returns {string[]}
 */
function extractPhotoUrlsFromPlace(place) {
  const urls = [];
  const seen = new Set();
  const photoNodes = place?.photos?.data;
  if (!Array.isArray(photoNodes)) return urls;

  for (const node of photoNodes) {
    const images = node?.images;
    if (!Array.isArray(images) || images.length === 0) continue;

    const sorted = [...images].sort(
      (a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0)
    );
    const best = sorted.find((img) => img?.source && isHttpUrl(img.source));
    if (!best?.source) continue;

    const url = best.source.trim();
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= MAX_PHOTOS_SAVE) break;
  }

  return urls;
}

/**
 * @param {object[]} results
 * @param {string} targetName
 */
function findBestPlaceMatch(results, targetName) {
  const target = normalizeName(targetName);
  if (!target) return null;

  let best = null;
  let bestScore = 0;

  for (const place of results) {
    const candidate = normalizeName(place?.name ?? "");
    if (!candidate) continue;
    const score = stringSimilarity.compareTwoStrings(target, candidate);
    if (score > bestScore) {
      bestScore = score;
      best = place;
    }
  }

  if (!best || bestScore < SIMILARITY_THRESHOLD) return null;
  return { place: best, score: bestScore };
}

/**
 * @param {string} accessToken
 * @param {string} query
 */
async function searchFacebookPlaces(accessToken, query) {
  const params = new URLSearchParams({
    type: "place",
    q: query,
    fields: "id,name,photos{images}",
    access_token: accessToken,
  });

  const url = `https://graph.facebook.com/${FB_API_VERSION}/search?${params.toString()}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(
      `Facebook API: ${json.error.message || JSON.stringify(json.error)}`
    );
  }

  return Array.isArray(json.data) ? json.data : [];
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 * @param {string[]} photoUrls
 */
async function savePhotos(supabase, id, photoUrls) {
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
  const accessToken = getFacebookAccessToken();

  const summary = {
    completedAt: null,
    processed: 0,
    saved: 0,
    skipped: 0,
    failed: 0,
    totalPhotos: 0,
    details: [],
  };

  console.log("Facebook place photos enrichment…\n");

  const restaurants = await fetchRestaurantsNeedingPhotos(supabase);
  const total = restaurants.length;
  console.log(
    `Restaurants needing photos (null or googleapis): ${total}\n`
  );

  if (total === 0) {
    summary.completedAt = new Date().toISOString();
    const summaryPath = resolve(process.cwd(), "summary-facebook-photos.json");
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log("Nothing to process. Summary written.");
    return;
  }

  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i];
    const index = i + 1;
    summary.processed += 1;

    const searchQuery = [restaurant.name, restaurant.city]
      .filter(Boolean)
      .join(" ")
      .trim();

    try {
      const results = await searchFacebookPlaces(accessToken, searchQuery);
      const match = findBestPlaceMatch(results, restaurant.name);

      if (!match) {
        summary.skipped += 1;
        console.log(
          `[${index}/${total}] ${restaurant.name} - SKIP: no name match`
        );
        summary.details.push({
          name: restaurant.name,
          slug: restaurant.slug,
          status: "skipped",
          reason: "no_name_match",
          candidates: results.length,
        });
      } else {
        const photoUrls = extractPhotoUrlsFromPlace(match.place);

        if (photoUrls.length === 0) {
          summary.skipped += 1;
          console.log(
            `[${index}/${total}] ${restaurant.name} - SKIP: no photos (${match.place.name}, score ${match.score.toFixed(2)})`
          );
          summary.details.push({
            name: restaurant.name,
            slug: restaurant.slug,
            status: "skipped",
            reason: "no_photos",
            matchedName: match.place.name,
            matchScore: match.score,
          });
        } else {
          await savePhotos(supabase, restaurant.id, photoUrls);
          summary.saved += 1;
          summary.totalPhotos += photoUrls.length;
          console.log(
            `[${index}/${total}] ${restaurant.name} - OK: ${photoUrls.length} photos`
          );
          summary.details.push({
            name: restaurant.name,
            slug: restaurant.slug,
            status: "saved",
            photos: photoUrls.length,
            matchedName: match.place.name,
            matchScore: match.score,
          });
        }
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
  const summaryPath = resolve(process.cwd(), "summary-facebook-photos.json");
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log("\n========== Summary ==========");
  console.log(`Processed: ${summary.processed}`);
  console.log(`Saved: ${summary.saved}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Total photos saved: ${summary.totalPhotos}`);
  console.log(`Summary written to ${summaryPath}`);
  console.log("DONE.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
