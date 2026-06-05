/**
 * Claude Haiku menu + SEO generation for restaurants without menu_data.
 * Run: npm run scrape-menu-smart
 *
 * Requires: menu_data column (scripts/migrations/add-menu-data-column.sql)
 * Requires: seo_content column (scripts/migrations/add-seo-content-column.sql)
 * Env: CLAUDE_API_KEY in .env.local
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const AI_DELAY_MS = 300;
const OVERLOAD_RETRY_MS = 30000;
const MAX_CLAUDE_RETRIES = 5;
const RESTAURANT_PAGE_SIZE = 100;
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const MIN_ITEMS_TO_SAVE = 3;
const MAX_TOKENS = 8192;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hasMenuData(menuData) {
  if (menuData == null) return false;
  if (typeof menuData !== "object") return false;
  const cats = menuData.categories;
  if (!Array.isArray(cats) || cats.length === 0) return false;
  return cats.some((c) => Array.isArray(c.items) && c.items.length > 0);
}

function countMenuItems(menuData) {
  if (!hasMenuData(menuData)) return 0;
  return menuData.categories.reduce(
    (sum, c) => sum + (c.items?.length ?? 0),
    0
  );
}

function formatBool(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  return "unknown";
}

function formatRating(rating) {
  if (rating == null || rating === "") return "not listed";
  const n = Number(rating);
  if (Number.isFinite(n)) return String(n);
  return String(rating).trim();
}

function normalizeMenuPayload(menuRaw) {
  const parsed = menuRaw && typeof menuRaw === "object" ? menuRaw : {};
  const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
  const normalized = categories
    .map((cat) => {
      const items = (Array.isArray(cat.items) ? cat.items : [])
        .map((item) => ({
          name: String(item.name || "").trim(),
          description: item.description
            ? String(item.description).trim()
            : null,
          price:
            typeof item.price === "number" && Number.isFinite(item.price)
              ? Math.round(item.price * 100) / 100
              : null,
        }))
        .filter((item) => item.name.length >= 2);
      return {
        name: String(cat.name || "Menu").trim() || "Menu",
        items,
      };
    })
    .filter((cat) => cat.items.length > 0);

  return {
    source: "ai_generated",
    categories: normalized,
  };
}

function truncate(str, maxLen) {
  const s = String(str || "").trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trim();
}

function normalizeSeoPayload(seoRaw) {
  const parsed = seoRaw && typeof seoRaw === "object" ? seoRaw : {};
  const faqRaw = Array.isArray(parsed.faq) ? parsed.faq : [];
  const faq = faqRaw
    .map((entry) => ({
      question: String(entry?.question || "").trim(),
      answer: String(entry?.answer || "").trim(),
    }))
    .filter((entry) => entry.question.length > 0 && entry.answer.length > 0);

  return {
    meta_title: truncate(parsed.meta_title, 60),
    meta_description: truncate(parsed.meta_description, 160),
    h1: String(parsed.h1 || "").trim(),
    about_section: String(parsed.about_section || "").trim(),
    faq,
  };
}

function hasSeoContent(seoContent) {
  if (seoContent == null || typeof seoContent !== "object") return false;
  return Boolean(
    seoContent.h1?.trim() &&
      seoContent.about_section?.trim() &&
      Array.isArray(seoContent.faq) &&
      seoContent.faq.length > 0
  );
}

function nameCityKey(name, city) {
  const n = String(name || "")
    .trim()
    .toLowerCase();
  const c = String(city || "")
    .trim()
    .toLowerCase();
  return `${n}|${c}`;
}

/**
 * Deduplicate: google_place_id first, then name + city when place id is null.
 * @param {object[]} restaurants
 */
function deduplicateRestaurants(restaurants) {
  const seenPlaceIds = new Set();
  const seenNameCity = new Set();
  const deduped = [];
  let duplicatesRemoved = 0;

  for (const row of restaurants) {
    const placeId = row.google_place_id?.trim();

    if (placeId) {
      if (seenPlaceIds.has(placeId)) {
        duplicatesRemoved += 1;
        continue;
      }
      seenPlaceIds.add(placeId);
      deduped.push(row);
      continue;
    }

    const key = nameCityKey(row.name, row.city);
    if (seenNameCity.has(key)) {
      duplicatesRemoved += 1;
      continue;
    }
    seenNameCity.add(key);
    deduped.push(row);
  }

  return { restaurants: deduped, duplicatesRemoved };
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

function getAnthropicApiKey() {
  const key = process.env.CLAUDE_API_KEY?.trim();
  if (!key || key.includes("your-")) {
    throw new Error("Missing CLAUDE_API_KEY in .env.local");
  }
  return key;
}

function priceLevelLabel(restaurant) {
  const raw =
    restaurant.price_level ?? restaurant.price_range ?? null;
  if (raw == null) return "mid-range (££)";
  const s = String(raw).trim();
  if (/£{3,}/.test(s) || s === "3" || /premium/i.test(s)) return "premium (£££)";
  if (/£{2}/.test(s) || s === "2" || /mid/i.test(s)) return "mid-range (££)";
  if (/£/.test(s) || s === "1" || /budget/i.test(s)) return "budget (£)";
  return s;
}

/**
 * Infer cuisine from restaurant name when cuisine_type is null.
 * @returns {{ cuisine: string; genericOnly: boolean; matchedKeyword: boolean }}
 */
function inferCuisineFromName(name) {
  const n = String(name || "").toLowerCase();

  if (/pizza/.test(n)) {
    return { cuisine: "Italian/Pizza", genericOnly: false, matchedKeyword: true };
  }
  if (/balti|curry|spice/.test(n)) {
    return { cuisine: "Indian", genericOnly: false, matchedKeyword: true };
  }
  if (/kebab|grill|doner/.test(n)) {
    return { cuisine: "Turkish", genericOnly: false, matchedKeyword: true };
  }
  if (/chicken|fried/.test(n)) {
    return { cuisine: "Chicken", genericOnly: false, matchedKeyword: true };
  }
  if (/burger|smash/.test(n)) {
    return { cuisine: "Burgers", genericOnly: false, matchedKeyword: true };
  }
  if (/chinese|wok|noodle/.test(n)) {
    return { cuisine: "Chinese", genericOnly: false, matchedKeyword: true };
  }
  if (/fish|chips/.test(n)) {
    return { cuisine: "British", genericOnly: false, matchedKeyword: true };
  }
  if (/thai/.test(n)) {
    return { cuisine: "Thai", genericOnly: false, matchedKeyword: true };
  }
  if (/arabic|shawarma/.test(n)) {
    return { cuisine: "Arabic", genericOnly: false, matchedKeyword: true };
  }

  return { cuisine: "Halal", genericOnly: true, matchedKeyword: false };
}

/**
 * @param {object} restaurant
 */
function resolveRestaurantCuisine(restaurant) {
  const existing = restaurant.cuisine_type?.trim();
  if (existing) {
    return {
      cuisine: existing,
      genericOnly: false,
      inferred: false,
      shouldUpdateDb: false,
    };
  }

  const inferred = inferCuisineFromName(restaurant.name);
  return {
    cuisine: inferred.cuisine,
    genericOnly: inferred.genericOnly,
    inferred: true,
    shouldUpdateDb: true,
    matchedKeyword: inferred.matchedKeyword,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 * @param {string} cuisineType
 */
async function updateCuisineTypeIfNull(supabase, id, cuisineType) {
  const { error } = await supabase
    .from("restaurants")
    .update({
      cuisine_type: cuisineType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("cuisine_type", null);

  if (error) throw new Error(`cuisine_type update: ${error.message}`);
}

function parseJsonFromClaude(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("no JSON object in Claude response");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function buildUserPrompt(restaurant, cuisineContext) {
  const name = restaurant.name?.trim() || "Restaurant";
  const cuisine = cuisineContext.cuisine;
  const genericOnly = cuisineContext.genericOnly;
  const city = restaurant.city?.trim() || "UK";
  const address = restaurant.address?.trim() || "not listed";
  const rating = formatRating(restaurant.rating);
  const priceLevel = priceLevelLabel(restaurant);
  const dineIn = formatBool(restaurant.dine_in);
  const takeaway = formatBool(restaurant.takeaway);
  const delivery = formatBool(restaurant.delivery);

  return `Generate content for this halal restaurant:
Name: ${name}
Cuisine: ${cuisine}
City: ${city}
Address: ${address}
Rating: ${rating}
Price level: ${priceLevel}
Dining options: dine-in=${dineIn}, takeaway=${takeaway}, delivery=${delivery}
Return ONLY this JSON:
{
  "menu": {
    "source": "ai_generated",
    "categories": [
      {
        "name": "string",
        "items": [
          {
            "name": "string",
            "description": "string",
            "price": 0.00
          }
        ]
      }
    ]
  },
  "seo": {
    "meta_title": "string (60 chars max)",
    "meta_description": "string (160 chars max)",
    "h1": "string",
    "about_section": "string (300-400 words, authentic UK food blog style; British English; keywords: halal, ${cuisine}, ${city}, restaurant)",
    "faq": [
      {
        "question": "string",
        "answer": "string"
      }
    ]
  }
}
Rules for menu:
- Match dishes EXACTLY to cuisine type
- Pizza place = only pizza dishes
- No cross-cuisine mixing
- All halal appropriate
- UK prices in £
- 4-5 categories, 5-8 items each
${
  genericOnly
    ? `GENERIC HALAL MODE (cuisine not identified from name — use "${cuisine}" only):
- Do NOT invent cuisine-specific dishes (no pizza, biryani, kebab shop specials, sushi, etc.)
- Menu must use generic halal items only, e.g. grilled chicken, lamb chops, rice, naan, mixed grill, chips, salad, soft drinks, dessert
- Use neutral category names: Starters, Mains, Sides, Drinks, Desserts
- SEO about_section: write about halal dining in ${city} with a general, honest description — do not claim the restaurant specialises in a specific cuisine
- Do not guess or invent a cuisine style`
    : ""
}
Rules for SEO:
- Natural keyword placement
- Include restaurant name in H1
- about_section MUST be authentic UK English (British spellings only: specialise, flavours, colour, centre, recognised, favourite, etc.)
- Write like a local UK food blog or honest review — conversational, warm, specific to ${city}
- Mention UK context naturally where it fits: high street, town centre, local community, neighbourhood, Friday night, family tea, takeaway run
- Use British phrasing such as: tucked away on, popular with locals, a firm favourite, well worth a visit, spot on, decent portion, handy for
- Reference UK dining culture naturally (dine-in, takeaway, delivery, prayer times nearby, halal-conscious diners)
- Do NOT use corporate American marketing tone
- Banned phrases and style: premier, we are committed, our mission is, world-class, elevate, curated experience, utilize, awesome
- FAQs cover: halal status, opening hours, delivery, parking, booking
- FAQ answers should also use British English and a helpful local tone
- Provide exactly 5 FAQs in the faq array`;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function ensureSeoContentColumn(supabase) {
  const { error } = await supabase
    .from("restaurants")
    .select("id, seo_content")
    .limit(1);

  if (!error) return;

  const message = error.message || "";
  if (
    /seo_content/i.test(message) &&
    (/column/i.test(message) || /schema cache/i.test(message))
  ) {
    throw new Error(
      "seo_content column missing. Run scripts/migrations/add-seo-content-column.sql in the Supabase SQL editor."
    );
  }

  throw new Error(`seo_content column check failed: ${message}`);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 */
async function restaurantStillNeedsMenu(supabase, id) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("menu_data")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`menu_data check: ${error.message}`);
  return !hasMenuData(data?.menu_data);
}

/**
 * @param {object} restaurant
 * @param {{ cuisine: string; genericOnly: boolean }} cuisineContext
 * @param {number} [attempt]
 */
async function generateContentWithClaude(
  restaurant,
  cuisineContext,
  attempt = 1
) {
  const apiKey = getAnthropicApiKey();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system:
        "You are a restaurant content generator. Return valid JSON only. No markdown, no explanation.",
      messages: [
        { role: "user", content: buildUserPrompt(restaurant, cuisineContext) },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const overloaded =
      res.status === 529 ||
      /overloaded/i.test(body) ||
      /rate.?limit/i.test(body);

    if (overloaded && attempt < MAX_CLAUDE_RETRIES) {
      console.log(
        `  Claude overloaded (HTTP ${res.status}), retry in 30s (${attempt}/${MAX_CLAUDE_RETRIES})…`
      );
      await sleep(OVERLOAD_RETRY_MS);
      return generateContentWithClaude(restaurant, cuisineContext, attempt + 1);
    }

    throw new Error(`Claude HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = json.content?.find((b) => b.type === "text")?.text?.trim();
  if (!text) throw new Error("empty Claude response");

  const parsed = parseJsonFromClaude(text);
  const menuData = normalizeMenuPayload(parsed.menu ?? parsed);
  const seoContent = normalizeSeoPayload(parsed.seo);
  const itemCount = countMenuItems(menuData);

  if (itemCount < MIN_ITEMS_TO_SAVE) {
    throw new Error(`menu too small (${itemCount} items)`);
  }

  if (!hasSeoContent(seoContent)) {
    throw new Error("SEO content incomplete (missing h1, about_section, or faq)");
  }

  return { menuData, seoContent, itemCount };
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
        "id, name, slug, city, address, cuisine_type, price_range, price_level, rating, dine_in, takeaway, delivery, google_place_id, menu_data, seo_content"
      )
      .is("menu_data", null)
      .order("name", { ascending: true })
      .range(offset, offset + RESTAURANT_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`restaurants fetch: ${error.message}`);
    }

    if (!data?.length) break;

    for (const row of data) {
      if (!hasMenuData(row.menu_data)) {
        all.push(row);
      }
    }

    if (data.length < RESTAURANT_PAGE_SIZE) break;
    offset += RESTAURANT_PAGE_SIZE;
  }

  return all;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function fetchRestaurantsStillWithoutMenu(supabase) {
  const all = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, menu_data")
      .range(offset, offset + RESTAURANT_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const row of data) {
      if (!hasMenuData(row.menu_data)) all.push(row.id);
    }

    if (data.length < RESTAURANT_PAGE_SIZE) break;
    offset += RESTAURANT_PAGE_SIZE;
  }

  return all.length;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 * @param {object} menuData
 * @param {object} seoContent
 */
/**
 * @returns {Promise<boolean>} true if saved, false if menu_data was already set
 */
async function saveRestaurantContent(supabase, id, menuData, seoContent) {
  const { data, error } = await supabase
    .from("restaurants")
    .update({
      menu_data: menuData,
      seo_content: seoContent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("menu_data", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const message = error.message || "";
    if (
      /seo_content/i.test(message) &&
      (/column/i.test(message) || /schema cache/i.test(message))
    ) {
      throw new Error(
        "seo_content column missing. Run scripts/migrations/add-seo-content-column.sql in the Supabase SQL editor."
      );
    }
    throw new Error(message);
  }

  return Boolean(data?.id);
}

async function main() {
  const supabase = createSupabaseClient();
  getAnthropicApiKey();
  await ensureSeoContentColumn(supabase);

  const summary = {
    completedAt: null,
    fetched: 0,
    duplicatesRemoved: 0,
    processed: 0,
    saved: 0,
    skipped: 0,
    cuisineInferred: 0,
    failed: 0,
    totalItems: 0,
    totalFaqs: 0,
    stillWithoutMenu: 0,
    details: [],
  };

  console.log("Claude Haiku menu + SEO generation…\n");

  const fetched = await fetchRestaurantsWithoutMenu(supabase);
  summary.fetched = fetched.length;
  const { restaurants, duplicatesRemoved } = deduplicateRestaurants(fetched);
  summary.duplicatesRemoved = duplicatesRemoved;
  const total = restaurants.length;
  console.log(`Fetched (menu_data null): ${summary.fetched}`);
  console.log(`Duplicates removed: ${duplicatesRemoved}`);
  console.log(`To process after dedupe: ${total}\n`);

  if (total === 0) {
    summary.stillWithoutMenu = await fetchRestaurantsStillWithoutMenu(supabase);
    summary.completedAt = new Date().toISOString();
    const summaryPath = resolve(process.cwd(), "summary-menus.json");
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log("Nothing to generate. Summary written.");
    return;
  }

  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i];
    const index = i + 1;
    summary.processed += 1;

    try {
      if (!(await restaurantStillNeedsMenu(supabase, restaurant.id))) {
        summary.skipped += 1;
        console.log(
          `[${index}/${total}] ${restaurant.name} - SKIP: menu_data already set`
        );
        summary.details.push({
          name: restaurant.name,
          slug: restaurant.slug,
          status: "skipped",
          reason: "menu_data_already_set",
        });
        await sleep(AI_DELAY_MS);
        continue;
      }

      const cuisineContext = resolveRestaurantCuisine(restaurant);

      if (cuisineContext.shouldUpdateDb) {
        await updateCuisineTypeIfNull(
          supabase,
          restaurant.id,
          cuisineContext.cuisine
        );
        restaurant.cuisine_type = cuisineContext.cuisine;
        summary.cuisineInferred += 1;
        const note = cuisineContext.genericOnly
          ? "generic Halal (no name clue)"
          : `from name → ${cuisineContext.cuisine}`;
        console.log(`  cuisine_type set: ${note}`);
      }

      const { menuData, seoContent, itemCount } =
        await generateContentWithClaude(restaurant, cuisineContext);

      if (!(await restaurantStillNeedsMenu(supabase, restaurant.id))) {
        summary.skipped += 1;
        console.log(
          `[${index}/${total}] ${restaurant.name} - SKIP: menu_data set during generation`
        );
        summary.details.push({
          name: restaurant.name,
          slug: restaurant.slug,
          status: "skipped",
          reason: "menu_data_set_during_generation",
        });
        await sleep(AI_DELAY_MS);
        continue;
      }

      const saved = await saveRestaurantContent(
        supabase,
        restaurant.id,
        menuData,
        seoContent
      );

      if (!saved) {
        summary.skipped += 1;
        console.log(
          `[${index}/${total}] ${restaurant.name} - SKIP: menu_data already saved`
        );
        summary.details.push({
          name: restaurant.name,
          slug: restaurant.slug,
          status: "skipped",
          reason: "menu_data_race_on_save",
        });
        await sleep(AI_DELAY_MS);
        continue;
      }

      summary.saved += 1;
      summary.totalItems += itemCount;
      summary.totalFaqs += seoContent.faq.length;
      console.log(
        `[${index}/${total}] ${restaurant.name} - OK: ${itemCount} items, ${seoContent.faq.length} FAQs`
      );
      summary.details.push({
        name: restaurant.name,
        slug: restaurant.slug,
        status: "saved",
        items: itemCount,
        categories: menuData.categories.length,
        faqs: seoContent.faq.length,
        metaTitleLength: seoContent.meta_title.length,
        cuisine: cuisineContext.cuisine,
        genericOnly: cuisineContext.genericOnly,
      });
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

    await sleep(AI_DELAY_MS);
  }

  summary.stillWithoutMenu = await fetchRestaurantsStillWithoutMenu(supabase);
  summary.completedAt = new Date().toISOString();

  const summaryPath = resolve(process.cwd(), "summary-menus.json");
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log("\n========== Summary ==========");
  console.log(`Fetched: ${summary.fetched}`);
  console.log(`Duplicates removed: ${summary.duplicatesRemoved}`);
  console.log(`AI content generated: ${summary.saved}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Cuisine inferred: ${summary.cuisineInferred}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Total menu items: ${summary.totalItems}`);
  console.log(`Total FAQs: ${summary.totalFaqs}`);
  console.log(`Still without menu: ${summary.stillWithoutMenu}`);
  console.log(`Summary written to ${summaryPath}`);
  console.log("DONE.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
