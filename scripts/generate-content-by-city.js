/**
 * Batch menu + SEO generation for restaurants in a city missing content.
 *
 * Usage:
 *   node scripts/generate-content-by-city.js --city=london --limit=20 --save
 *   node scripts/generate-content-by-city.js --city=london --save   (all remaining)
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { readFileSync, writeFileSync, existsSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const {
  generateContentWithClaude,
  generateSeoOnlyWithClaude,
  hasMenuData,
  hasSeoContent,
  resolveRestaurantCuisine,
  updateCuisineTypeIfNull,
} = require("./menu-scraper-smart");

const AI_DELAY_MS = 300;
const PAGE_SIZE = 200;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs() {
  const cityArg = process.argv.find((a) => a.startsWith("--city="));
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const city = (cityArg?.split("=")[1] || "london").trim().toLowerCase();
  const limitRaw = limitArg?.split("=")[1];
  const limit = limitRaw ? Number(limitRaw) : null;
  const save = process.argv.includes("--save");
  return { city, limit, save };
}

function progressPath(city) {
  return resolve(process.cwd(), `summary-content-${city}.json`);
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars in .env.local");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function loadProgress(city) {
  const path = progressPath(city);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function saveProgress(city, summary) {
  writeFileSync(progressPath(city), JSON.stringify(summary, null, 2));
}

function needsContent(row) {
  return !hasMenuData(row.menu_data) || !hasSeoContent(row.seo_content);
}

async function fetchCityRestaurantsNeedingContent(supabase, cityPattern) {
  const all = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "id, name, slug, city, address, cuisine_type, price_range, price_level, rating, dine_in, takeaway, delivery, halal_status, google_place_id, menu_data, seo_content, is_active"
      )
      .eq("is_active", true)
      .ilike("city", `%${cityPattern}%`)
      .order("name", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const row of data) {
      if (needsContent(row)) all.push(row);
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

async function main() {
  const { city, limit, save } = parseArgs();
  const supabase = createSupabaseClient();
  const prior = loadProgress(city);
  const doneSlugs = new Set(
    (prior?.completed || []).map((r) => r.slug).filter(Boolean)
  );

  const candidates = await fetchCityRestaurantsNeedingContent(supabase, city);
  const todo = candidates.filter((r) => !doneSlugs.has(r.slug));
  const batch = limit ? todo.slice(0, limit) : todo;
  const total = batch.length;

  const summary = prior || {
    city,
    startedAt: new Date().toISOString(),
    candidates: candidates.length,
    completed: [],
    skipped: [],
    failed: [],
    blocked: [],
  };

  summary.candidates = candidates.length;
  summary.lastRunAt = new Date().toISOString();

  console.log(`City filter: ${city} (${candidates.length} need content)`);
  console.log(`Already done this run: ${doneSlugs.size}`);
  console.log(`This batch: ${total}`);
  console.log(`Mode: ${save ? "SAVE" : "dry run"}\n`);

  if (total === 0) {
    console.log("Nothing to do.");
    return;
  }

  for (let i = 0; i < batch.length; i++) {
    const restaurant = batch[i];
    const index = i + 1;
    const label = `${restaurant.slug} (${restaurant.name})`;

    if (!restaurant.city?.trim()) {
      summary.blocked.push({ slug: restaurant.slug, reason: "no_city" });
      console.log(`[${index}/${total}] BLOCKED ${label}: no city`);
      saveProgress(city, summary);
      continue;
    }

    try {
      const cuisineContext = resolveRestaurantCuisine(restaurant);
      const seoOnly =
        hasMenuData(restaurant.menu_data) &&
        !hasSeoContent(restaurant.seo_content);

      if (cuisineContext.shouldUpdateDb && save) {
        await updateCuisineTypeIfNull(
          supabase,
          restaurant.id,
          cuisineContext.cuisine
        );
        restaurant.cuisine_type = cuisineContext.cuisine;
      }

      console.log(
        `[${index}/${total}] Generating ${seoOnly ? "SEO only" : "menu+SEO"} — ${label}…`
      );

      const { menuData, seoContent, itemCount } = seoOnly
        ? await generateSeoOnlyWithClaude(restaurant, cuisineContext)
        : await generateContentWithClaude(restaurant, cuisineContext);

      if (!save) {
        console.log(
          `  DRY RUN OK: ${itemCount} menu items, ${seoContent.faq.length} FAQs`
        );
        summary.completed.push({
          slug: restaurant.slug,
          status: "dry_run",
          seoOnly,
          items: itemCount,
          faqs: seoContent.faq.length,
        });
        saveProgress(city, summary);
        await sleep(AI_DELAY_MS);
        continue;
      }

      const update = { updated_at: new Date().toISOString() };
      if (!hasMenuData(restaurant.menu_data)) update.menu_data = menuData;
      if (!hasSeoContent(restaurant.seo_content)) update.seo_content = seoContent;

      const { error: saveError } = await supabase
        .from("restaurants")
        .update(update)
        .eq("id", restaurant.id);

      if (saveError) throw new Error(saveError.message);

      console.log(
        `[${index}/${total}] SAVED ${label} — ${itemCount} items, ${seoContent.faq.length} FAQs (${doneSlugs.size + index}/${candidates.length} city total)`
      );
      summary.completed.push({
        slug: restaurant.slug,
        status: "saved",
        seoOnly,
        items: itemCount,
        faqs: seoContent.faq.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[${index}/${total}] FAIL ${label}: ${message}`);
      summary.failed.push({ slug: restaurant.slug, error: message });
    }

    summary.finishedAt = new Date().toISOString();
    saveProgress(city, summary);
    await sleep(AI_DELAY_MS);
  }

  const remaining = candidates.length - summary.completed.length;
  console.log("\n========== Batch done ==========");
  console.log(`Saved this city run: ${summary.completed.length}`);
  console.log(`Failed: ${summary.failed.length}`);
  console.log(`Remaining in ${city}: ${Math.max(0, remaining)}`);
  console.log(`Progress: ${progressPath(city)}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
