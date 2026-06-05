/**
 * Enrich Supabase restaurants from Just Eat API (by lat/lng + name match).
 * Run migration scripts/migrations/add-justeat-restaurant-columns.sql first.
 * Run: npm run extract-justeat
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");
const stringSimilarity = require("string-similarity");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const JUST_EAT_LATLNG_URL =
  "https://uk.api.just-eat.io/restaurants/enriched/bylatlong";
const RESTAURANT_BATCH_SIZE = 50;
const SIMILARITY_THRESHOLD = 0.5;
const LOOKUP_DELAY_MS = 1000;
const MENU_CATEGORY_NAME = "Just Eat Menu";
const FETCH_TIMEOUT_MS = 60000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function latLngCacheKey(lat, lon) {
  return `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
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

function parsePrice(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = parseFloat(String(value).replace(/[£,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
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

function justEatHeaders() {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-GB,en;q=0.9",
    Referer: "https://www.just-eat.co.uk/",
    Origin: "https://www.just-eat.co.uk",
  };
  const apiKey = process.env.JUST_EAT_API_KEY?.trim();
  if (apiKey) {
    headers.Authorization = apiKey.startsWith("JE-API-KEY")
      ? apiKey
      : `JE-API-KEY ${apiKey}`;
  }
  return headers;
}

/**
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<object[]>}
 */
async function fetchJustEatByLatLng(lat, lon) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lon),
  });
  const res = await fetch(`${JUST_EAT_LATLNG_URL}?${params}`, {
    method: "GET",
    headers: justEatHeaders(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Just Eat HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return getRestaurantsFromPayload(data);
}

/**
 * @param {unknown} data
 * @returns {object[]}
 */
function getRestaurantsFromPayload(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const root = /** @type {Record<string, unknown>} */ (data);
  const candidates = [
    root.restaurants,
    root.Restaurants,
    root.data,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    if (c && typeof c === "object") {
      const nested = /** @type {Record<string, unknown>} */ (c);
      if (Array.isArray(nested.restaurants)) return nested.restaurants;
      if (Array.isArray(nested.Restaurants)) return nested.Restaurants;
    }
  }
  return [];
}

/**
 * @param {object} r
 * @returns {string}
 */
function getJeName(r) {
  return (
    r.name ||
    r.Name ||
    r.displayName ||
    r.restaurantName ||
    ""
  );
}

/**
 * @param {object} r
 * @param {string} dbName
 * @returns {number}
 */
function nameSimilarity(r, dbName) {
  const a = normalizeName(dbName);
  const b = normalizeName(getJeName(r));
  if (!a || !b) return 0;
  return stringSimilarity.compareTwoStrings(a, b);
}

/**
 * @param {object[]} list
 * @param {string} dbName
 * @returns {{ match: object | null; score: number }}
 */
function findBestMatch(list, dbName) {
  let best = null;
  let bestScore = 0;
  for (const r of list) {
    const score = nameSimilarity(r, dbName);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  if (bestScore < SIMILARITY_THRESHOLD) {
    return { match: null, score: bestScore };
  }
  return { match: best, score: bestScore };
}

/**
 * @param {object} r
 * @returns {{ name: string; description: string | null; price: number | null }[]}
 */
function extractMenuItems(r) {
  const out = [];
  const seen = new Set();

  const pushItem = (item) => {
    if (!item || typeof item !== "object") return;
    const name =
      item.name ||
      item.Name ||
      item.title ||
      item.displayName ||
      null;
    if (!name || seen.has(name)) return;
    seen.add(name);
    const price =
      parsePrice(item.price) ??
      parsePrice(item.Price) ??
      parsePrice(item.unitPrice) ??
      parsePrice(item?.variations?.[0]?.price) ??
      parsePrice(item?.Variations?.[0]?.Price);
    out.push({
      name: String(name).trim(),
      description:
        item.description ||
        item.Description ||
        item.summary ||
        null,
      price,
    });
  };

  const flat = r.menuItems || r.MenuItems;
  if (Array.isArray(flat)) {
    for (const item of flat) pushItem(item);
  }

  const menus = r.Menu || r.menu || r.menus || r.Catalogue || [];
  if (Array.isArray(menus)) {
    for (const section of menus) {
      if (!section || typeof section !== "object") continue;
      const items =
        section.menuItems ||
        section.MenuItems ||
        section.Items ||
        section.items ||
        [];
      if (Array.isArray(items)) {
        for (const item of items) pushItem(item);
      }
    }
  }

  return out;
}

/**
 * @param {object} r
 */
function mapJustEatFields(r) {
  const cuisines = r.cuisines || r.Cuisines || [];
  const rating = r.rating || r.Rating || {};
  const address = r.address || r.Address || {};
  const starRating =
    rating.starRating ??
    rating.StarRating ??
    rating.average ??
    rating.score ??
    null;
  const reviewCount =
    rating.count ?? rating.Count ?? rating.reviewCount ?? null;

  const phone =
    r.phone ||
    r.Phone ||
    r.telephone ||
    address.phone ||
    address.Phone ||
    null;

  const logoUrl =
    r.logoUrl ||
    r.LogoUrl ||
    r.logo ||
    r.imageUrl ||
    r.ImageUrl ||
    null;

  const isTemporarilyOffline = Boolean(
    r.isTemporarilyOffline ??
      r.IsTemporarilyOffline ??
      r.isOffline ??
      false
  );

  return {
    cuisines,
    starRating:
      starRating != null && Number.isFinite(Number(starRating))
        ? Number(starRating)
        : null,
    reviewCount:
      reviewCount != null && Number.isFinite(Number(reviewCount))
        ? Number(reviewCount)
        : null,
    addressFirstLine:
      address.firstLine ||
      address.FirstLine ||
      (Array.isArray(address.lines) ? address.lines[0] : null) ||
      null,
    addressCity: address.city || address.City || null,
    addressPostcode: address.postcode || address.Postcode || null,
    phone,
    isOpenNow: r.isOpenNow ?? r.IsOpenNow ?? null,
    isTemporarilyOffline,
    logoUrl,
    menuItems: extractMenuItems(r),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} restaurantId
 * @returns {Promise<string>}
 */
async function getOrCreateMenuCategory(supabase, restaurantId) {
  const { data: existing } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("name", MENU_CATEGORY_NAME)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("menu_categories")
    .insert({
      restaurant_id: restaurantId,
      name: MENU_CATEGORY_NAME,
      display_order: 0,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`menu_categories insert: ${error.message}`);
  }
  return created.id;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} restaurant
 * @param {object} je
 * @param {number} score
 */
async function applyJustEatMatch(supabase, restaurant, je, score) {
  const mapped = mapJustEatFields(je);
  const cuisineName =
    mapped.cuisines[0]?.name ||
    mapped.cuisines[0]?.Name ||
    mapped.cuisines[0]?.uniqueName ||
    null;

  const now = new Date().toISOString();
  const updatePayload = {
    cuisine_type: cuisineName,
    phone: mapped.phone,
    logo_url: mapped.logoUrl,
    is_active: !mapped.isTemporarilyOffline,
    is_temporarily_closed: mapped.isTemporarilyOffline,
    updated_at: now,
  };

  const { error: updateError } = await supabase
    .from("restaurants")
    .update(updatePayload)
    .eq("id", restaurant.id);

  if (updateError) {
    throw new Error(`restaurant update: ${updateError.message}`);
  }

  await supabase
    .from("reviews")
    .delete()
    .eq("restaurant_id", restaurant.id)
    .eq("source", "justeat");

  if (mapped.starRating != null) {
    const countLabel =
      mapped.reviewCount != null ? String(mapped.reviewCount) : "many";
    const { error: reviewError } = await supabase.from("reviews").insert({
      restaurant_id: restaurant.id,
      rating: mapped.starRating,
      source: "justeat",
      author_name: "Just Eat",
      content: `Rated ${mapped.starRating} stars on Just Eat based on ${countLabel} reviews`,
      is_verified: true,
      date: new Date().toISOString().slice(0, 10),
    });
    if (reviewError) {
      throw new Error(`reviews insert: ${reviewError.message}`);
    }
  }

  if (mapped.logoUrl) {
    await supabase
      .from("restaurant_photos")
      .delete()
      .eq("restaurant_id", restaurant.id)
      .eq("source", "justeat");

    await supabase.from("restaurant_photos").insert({
      restaurant_id: restaurant.id,
      url: mapped.logoUrl,
      alt_text: `${restaurant.name} logo`,
      is_primary: true,
      source: "justeat",
    });
  }

  const categoryId = await getOrCreateMenuCategory(supabase, restaurant.id);

  const { data: oldItems } = await supabase
    .from("menu_items")
    .select("id")
    .eq("category_id", categoryId);

  if (oldItems?.length) {
    await supabase
      .from("menu_items")
      .delete()
      .eq("category_id", categoryId);
  }

  if (mapped.menuItems.length > 0) {
    const rows = mapped.menuItems.map((item) => ({
      restaurant_id: restaurant.id,
      category_id: categoryId,
      name: item.name,
      description: item.description,
      price: item.price,
      currency: "GBP",
      is_halal: null,
    }));

    const { error: menuError } = await supabase.from("menu_items").insert(rows);
    if (menuError) {
      throw new Error(`menu_items insert: ${menuError.message}`);
    }
  }

  return {
    score,
    menuCount: mapped.menuItems.length,
    starRating: mapped.starRating,
    reviewCount: mapped.reviewCount,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number} offset
 */
async function fetchRestaurantBatch(supabase, offset) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, city, latitude, longitude")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("id", { ascending: true })
    .range(offset, offset + RESTAURANT_BATCH_SIZE - 1);

  if (error) {
    throw new Error(`restaurants fetch: ${error.message}`);
  }
  return data ?? [];
}

async function main() {
  const supabase = createSupabaseClient();
  const locationCache = new Map();
  const summary = {
    processed: 0,
    matched: 0,
    updated: 0,
    skippedNoCoords: 0,
    noMatch: 0,
    errors: 0,
    details: [],
  };

  let offset = 0;
  let batchNum = 0;
  let totalWithCoords = 0;

  console.log("Starting Just Eat enrichment (lat/lng + name match)…\n");

  while (true) {
    batchNum += 1;
    const batch = await fetchRestaurantBatch(supabase, offset);
    if (batch.length === 0) break;

    totalWithCoords += batch.length;
    console.log(
      `Batch ${batchNum}: processing ${batch.length} restaurants (offset ${offset})…`
    );

    for (const restaurant of batch) {
      summary.processed += 1;
      const lat = Number(restaurant.latitude);
      const lon = Number(restaurant.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        summary.skippedNoCoords += 1;
        continue;
      }

      try {
        const cacheKey = latLngCacheKey(lat, lon);
        let jeList = locationCache.get(cacheKey);
        if (!jeList) {
          jeList = await fetchJustEatByLatLng(lat, lon);
          locationCache.set(cacheKey, jeList);
          await sleep(LOOKUP_DELAY_MS);
        }

        const { match, score } = findBestMatch(jeList, restaurant.name);
        if (!match) {
          summary.noMatch += 1;
          console.log(
            `  No match: ${restaurant.name} (${lat}, ${lon}) best score ${score.toFixed(2)}`
          );
          continue;
        }

        summary.matched += 1;
        const result = await applyJustEatMatch(
          supabase,
          restaurant,
          match,
          score
        );
        summary.updated += 1;
        console.log(
          `  Matched: ${restaurant.name} → ${getJeName(match)} (score ${score.toFixed(2)}, ${result.menuCount} menu items)`
        );
        summary.details.push({
          slug: restaurant.slug,
          jeName: getJeName(match),
          score,
          menuCount: result.menuCount,
        });
      } catch (err) {
        summary.errors += 1;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  Error: ${restaurant.name} — ${message}`);
        summary.details.push({
          slug: restaurant.slug,
          error: message,
        });
      }
    }

    offset += RESTAURANT_BATCH_SIZE;
    if (batch.length < RESTAURANT_BATCH_SIZE) break;
  }

  const summaryPath = resolve(process.cwd(), "summary-justeat.json");
  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        completedAt: new Date().toISOString(),
        totalWithCoords,
        ...summary,
      },
      null,
      2
    )
  );

  console.log("\n--- Just Eat summary ---");
  console.log(`Processed: ${summary.processed}`);
  console.log(`Matched: ${summary.matched}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`No match: ${summary.noMatch}`);
  console.log(`Errors: ${summary.errors}`);
  console.log(`Lat/lng API lookups: ${locationCache.size}`);
  console.log(`Summary written to ${summaryPath}`);
  console.log(
    `DONE: ${summary.updated} restaurants enriched from Just Eat`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
