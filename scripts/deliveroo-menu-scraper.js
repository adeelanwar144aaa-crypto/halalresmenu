/**
 * Scrape Deliveroo menus → restaurants.menu_data (JSONB).
 * Run migration scripts/migrations/add-menu-data-column.sql first.
 * Run: npm run scrape-deliveroo-menu
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");
const { randomUUID } = require("crypto");
const stringSimilarity = require("string-similarity");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const DELIVEROO_BASE = "https://api.uk.deliveroo.com/orderapp/v1";
const REQUEST_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 60000;
const SIMILARITY_THRESHOLD = 0.5;
const RESTAURANT_PAGE_SIZE = 100;

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

function normalizePostcode(postcode) {
  if (!postcode?.trim()) return null;
  const raw = postcode.replace(/\s+/g, "").toUpperCase();
  if (raw.length < 5) return raw;
  return `${raw.slice(0, -3)} ${raw.slice(-3)}`;
}

function parsePrice(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 100 ? value / 100 : value;
  }
  if (typeof value === "object") {
    if (typeof value.fractional === "number") return value.fractional / 100;
    if (typeof value.Fractional === "number") return value.Fractional / 100;
    if (typeof value.amount === "number") return value.amount;
  }
  const n = parseFloat(String(value).replace(/[£,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function extractPhotoUrl(item) {
  if (!item || typeof item !== "object") return null;
  const candidates = [
    item.image_url,
    item.imageUrl,
    item.image?.url,
    item.media?.image?.url,
    item.attributes?.image_url,
    item.attributes?.image?.url,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }
  return null;
}

/**
 * @param {object} item
 */
function mapMenuItem(item) {
  if (!item || typeof item !== "object") return null;
  const attrs = item.attributes && typeof item.attributes === "object"
    ? item.attributes
    : item;

  const name =
    attrs.name ||
    attrs.title ||
    item.name ||
    item.title ||
    null;
  if (!name || !String(name).trim()) return null;

  const price =
    parsePrice(attrs.price) ??
    parsePrice(attrs.price_discounted) ??
    parsePrice(item.price) ??
    parsePrice(attrs.unit_price);

  return {
    name: String(name).trim(),
    description:
      attrs.description ||
      attrs.item_description ||
      item.description ||
      null,
    price,
    photo: extractPhotoUrl(attrs) ?? extractPhotoUrl(item),
  };
}

/**
 * @param {object} payload — restaurant detail or search result
 * @returns {{ categories: { name: string; items: object[] }[] }}
 */
function extractMenuData(payload) {
  /** @type {{ name: string; items: object[] }[]} */
  const categories = [];
  const seenCat = new Set();

  const addCategory = (name, rawItems) => {
    if (!Array.isArray(rawItems)) return;
    const items = [];
    const seen = new Set();
    for (const raw of rawItems) {
      const mapped = mapMenuItem(raw);
      if (!mapped || seen.has(mapped.name)) continue;
      seen.add(mapped.name);
      items.push(mapped);
    }
    if (items.length === 0) return;
    const label = String(name || "Menu").trim() || "Menu";
    const key = label.toLowerCase();
    if (seenCat.has(key)) return;
    seenCat.add(key);
    categories.push({ name: label, items });
  };

  const roots = [
    payload?.menu,
    payload?.data?.menu,
    payload?.data?.attributes?.menu,
    payload?.attributes?.menu,
    payload,
  ].filter(Boolean);

  for (const root of roots) {
    if (!root || typeof root !== "object") continue;

    const cats =
      root.categories ||
      root.menu_categories ||
      root.menuCategories ||
      root.Categories;

    if (Array.isArray(cats)) {
      for (const cat of cats) {
        if (!cat || typeof cat !== "object") continue;
        const catAttrs = cat.attributes || cat;
        const catName = catAttrs.name || cat.name || cat.title || "Menu";
        const items =
          cat.items ||
          cat.menu_items ||
          cat.menuItems ||
          catAttrs.items ||
          catAttrs.menu_items ||
          [];
        addCategory(catName, items);
      }
    }

    const layout = root.layout || root.menu_layout;
    if (Array.isArray(layout)) {
      for (const block of layout) {
        if (!block || typeof block !== "object") continue;
        addCategory(
          block.title || block.name || "Menu",
          block.items || block.menu_items || []
        );
      }
    }
  }

  if (Array.isArray(payload?.included)) {
    const itemsById = new Map();
    for (const inc of payload.included) {
      if (
        inc?.type === "menu_item" ||
        inc?.type === "item" ||
        inc?.type === "product"
      ) {
        itemsById.set(String(inc.id), inc);
      }
    }
    for (const inc of payload.included) {
      if (inc?.type !== "category" && inc?.type !== "menu_category") continue;
      const relItems = inc.relationships?.items?.data || inc.items || [];
      const resolved = relItems
        .map((ref) => {
          const id = ref?.id ?? ref;
          return itemsById.get(String(id));
        })
        .filter(Boolean);
      const catName = inc.attributes?.name || inc.name || "Menu";
      addCategory(catName, resolved.length ? resolved : inc.items);
    }
  }

  const flat =
    payload?.menu_items ||
    payload?.items ||
    payload?.data?.attributes?.menu_items;
  if (Array.isArray(flat)) {
    addCategory("Menu", flat);
  }

  return { categories };
}

function countMenuItems(menuData) {
  if (!menuData?.categories) return 0;
  return menuData.categories.reduce(
    (sum, c) => sum + (c.items?.length ?? 0),
    0
  );
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

function deliverooHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "application/json",
    "Accept-Language": "en-GB",
    Referer: "https://deliveroo.co.uk/",
    Origin: "https://deliveroo.co.uk",
    "X-Roo-Client": "consumer-web-app",
    "X-Roo-Country": "uk",
    "X-Roo-Guid": randomUUID(),
    "X-Roo-Session-Guid": randomUUID(),
    "X-Roo-Sticky-Guid": randomUUID(),
  };
}

/**
 * @param {string} pathWithQuery
 */
async function deliverooGet(pathWithQuery) {
  const url = pathWithQuery.startsWith("http")
    ? pathWithQuery
    : `${DELIVEROO_BASE}${pathWithQuery}`;

  const res = await fetch(url, {
    method: "GET",
    headers: deliverooHeaders(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Deliveroo HTTP ${res.status}: ${text.slice(0, 280)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Deliveroo returned non-JSON: ${text.slice(0, 120)}`);
  }
}

/**
 * @param {unknown} data
 * @returns {object[]}
 */
function getRestaurantsFromPayload(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const root = /** @type {Record<string, unknown>} */ (data);
  if (Array.isArray(root.data)) {
    return root.data.map((entry) => {
      if (!entry || typeof entry !== "object") return entry;
      const e = /** @type {Record<string, unknown>} */ (entry);
      const attrs = e.attributes || {};
      return {
        ...attrs,
        id: e.id ?? attrs.id,
        links: e.links,
        type: e.type,
      };
    });
  }
  if (Array.isArray(root.restaurants)) return root.restaurants;
  return [];
}

/**
 * @param {object} r
 */
function getDrName(r) {
  return r.name || r.title || r.display_name || "";
}

/**
 * @param {object} r
 */
function getDrId(r) {
  return r.id ?? r.restaurant_id ?? r.uname ?? null;
}

/**
 * @param {object[]} list
 * @param {string} dbName
 */
function findBestMatch(list, dbName) {
  let best = null;
  let bestScore = 0;
  for (const r of list) {
    const score = stringSimilarity.compareTwoStrings(
      normalizeName(dbName),
      normalizeName(getDrName(r))
    );
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
 * Search Deliveroo by postcode and optional name/city filter.
 * @param {object} restaurant
 */
async function searchDeliveroo(restaurant) {
  const postcode = normalizePostcode(restaurant.postcode);
  const name = restaurant.name?.trim();
  const city = restaurant.city?.trim();

  const attempts = [];

  if (postcode) {
    attempts.push(
      `/restaurants?postcode=${encodeURIComponent(postcode)}`,
      `/restaurants?post_code=${encodeURIComponent(postcode)}`
    );
    if (name) {
      attempts.push(
        `/restaurants?postcode=${encodeURIComponent(postcode)}&query=${encodeURIComponent(name)}`
      );
    }
  }

  if (city && name) {
    attempts.push(
      `/restaurants?query=${encodeURIComponent(`${name} ${city}`)}`
    );
    if (postcode) {
      attempts.push(
        `/restaurants?postcode=${encodeURIComponent(postcode)}&query=${encodeURIComponent(`${name} ${city}`)}`
      );
    }
  }

  if (
    typeof restaurant.latitude === "number" &&
    typeof restaurant.longitude === "number"
  ) {
    attempts.push(
      `/restaurants?latitude=${restaurant.latitude}&longitude=${restaurant.longitude}`
    );
    attempts.push(
      `/restaurants?lat=${restaurant.latitude}&lng=${restaurant.longitude}`
    );
  }

  let lastError = null;
  for (const path of attempts) {
    try {
      const data = await deliverooGet(path);
      const list = getRestaurantsFromPayload(data);
      if (list.length > 0) return list;
    } catch (err) {
      lastError = err;
    }
    await sleep(REQUEST_DELAY_MS);
  }

  if (lastError) throw lastError;
  return [];
}

/**
 * @param {object} match
 */
async function fetchDeliverooMenu(match) {
  const embedded = extractMenuData(match);
  if (countMenuItems(embedded) > 0) return embedded;

  const urls = [];
  if (typeof match.links?.self === "string") {
    urls.push(match.links.self);
  }
  const id = getDrId(match);
  if (id) {
    const idStr = encodeURIComponent(String(id));
    urls.push(`${DELIVEROO_BASE}/restaurants/${idStr}`);
    urls.push(`${DELIVEROO_BASE}/restaurants/${idStr}/menu`);
  }

  let lastError = null;
  for (const url of urls) {
    try {
      const data = await deliverooGet(url);
      const menuData = extractMenuData(data);
      if (countMenuItems(menuData) > 0) return menuData;
      lastError = new Error("menu empty in response");
    } catch (err) {
      lastError = err;
    }
    await sleep(REQUEST_DELAY_MS);
  }

  throw lastError ?? new Error("could not load menu");
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function fetchRestaurantsWithoutMenu(supabase) {
  const all = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "id, name, slug, postcode, city, latitude, longitude, menu_data"
      )
      .order("name", { ascending: true })
      .range(offset, offset + RESTAURANT_PAGE_SIZE - 1);

    if (error) throw new Error(`restaurants fetch: ${error.message}`);
    if (!data?.length) break;

    for (const row of data) {
      const md = row.menu_data;
      const hasMenu =
        md &&
        typeof md === "object" &&
        Array.isArray(md.categories) &&
        md.categories.some((c) => c.items?.length > 0);
      if (!hasMenu) all.push(row);
    }

    if (data.length < RESTAURANT_PAGE_SIZE) break;
    offset += RESTAURANT_PAGE_SIZE;
  }

  return all;
}

/**
 * @param {object} restaurant
 */
async function scrapeMenuForRestaurant(restaurant) {
  const candidates = await searchDeliveroo(restaurant);
  await sleep(REQUEST_DELAY_MS);

  if (candidates.length === 0) {
    return { ok: false, reason: "no Deliveroo listings for area" };
  }

  const { match, score } = findBestMatch(candidates, restaurant.name);
  if (!match) {
    return {
      ok: false,
      reason: `no name match (best score ${score.toFixed(2)})`,
    };
  }

  const menuData = await fetchDeliverooMenu(match);
  const itemCount = countMenuItems(menuData);

  if (itemCount === 0) {
    return { ok: false, reason: "matched but menu empty" };
  }

  return {
    ok: true,
    menuData,
    itemCount,
    matchName: getDrName(match),
    score,
  };
}

async function main() {
  const supabase = createSupabaseClient();
  const summary = {
    processed: 0,
    saved: 0,
    skipped: 0,
    failed: 0,
    totalItems: 0,
    details: [],
  };

  console.log("Deliveroo menu scraper starting…");
  console.log(
    "Ensure scripts/migrations/add-menu-data-column.sql has been applied.\n"
  );

  const restaurants = await fetchRestaurantsWithoutMenu(supabase);
  console.log(`Found ${restaurants.length} restaurants without menu_data.\n`);

  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i];
    summary.processed += 1;
    const label = `[${i + 1}/${restaurants.length}] ${restaurant.name}`;

    try {
      const result = await scrapeMenuForRestaurant(restaurant);

      if (!result.ok) {
        summary.skipped += 1;
        console.log(`${label} — skip: ${result.reason}`);
        summary.details.push({
          name: restaurant.name,
          slug: restaurant.slug,
          status: "skipped",
          reason: result.reason,
        });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("restaurants")
        .update({ menu_data: result.menuData, updated_at: now })
        .eq("id", restaurant.id);

      if (error) throw new Error(error.message);

      summary.saved += 1;
      summary.totalItems += result.itemCount;
      console.log(
        `${label} — OK: ${result.itemCount} items (${result.menuData.categories.length} categories) via "${result.matchName}" score ${result.score.toFixed(2)}`
      );
      summary.details.push({
        name: restaurant.name,
        slug: restaurant.slug,
        status: "saved",
        items: result.itemCount,
        categories: result.menuData.categories.length,
        matchName: result.matchName,
        score: result.score,
      });
    } catch (err) {
      summary.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`${label} — FAIL: ${message}`);
      summary.details.push({
        name: restaurant.name,
        slug: restaurant.slug,
        status: "failed",
        error: message,
      });
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const summaryPath = resolve(process.cwd(), "summary-deliveroo.json");
  writeFileSync(
    summaryPath,
    JSON.stringify({ completedAt: new Date().toISOString(), ...summary }, null, 2)
  );

  console.log("\n========== Deliveroo menu summary ==========");
  console.log(`Processed: ${summary.processed}`);
  console.log(`Menus saved: ${summary.saved}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Total menu items fetched: ${summary.totalItems}`);
  console.log(`Summary written to ${summaryPath}`);
  console.log("DONE.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
