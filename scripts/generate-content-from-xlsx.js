/**
 * Batch menu + SEO generation for restaurant slugs listed in Halal content.xlsx.
 * Reuses menu-scraper-smart.js (Claude Haiku).
 *
 * Usage:
 *   node scripts/generate-content-from-xlsx.js "C:/Users/adeel/Downloads/Halal content.xlsx"
 *   node scripts/generate-content-from-xlsx.js "..." --save
 *   node scripts/generate-content-from-xlsx.js "..." --save --skip=lavish-lounge,kfc-aberdeen
 */

const { createClient } = require("@supabase/supabase-js");
const AdmZip = require("adm-zip");
const { config } = require("dotenv");
const { resolve } = require("path");
const { readFileSync, writeFileSync, existsSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const {
  generateContentWithClaude,
  hasMenuData,
  hasSeoContent,
  resolveRestaurantCuisine,
  updateCuisineTypeIfNull,
} = require("./menu-scraper-smart");

const AI_DELAY_MS = 300;
const PROGRESS_PATH = resolve(process.cwd(), "summary-content-xlsx.json");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs() {
  const xlsxPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!xlsxPath) {
    throw new Error(
      'Usage: node scripts/generate-content-from-xlsx.js "path/to/Halal content.xlsx" [--save] [--skip=slug1,slug2]'
    );
  }
  const save = process.argv.includes("--save");
  const skipArg = process.argv.find((a) => a.startsWith("--skip="));
  const skip = new Set(
    (skipArg?.split("=")[1] || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  return { xlsxPath, save, skip };
}

function slugFromUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!host.endsWith(".halalresmenu.com")) return null;
    const slug = host.replace(".halalresmenu.com", "");
    if (!slug || slug === "www") return null;
    return slug;
  } catch {
    return null;
  }
}

function readSlugsFromXlsx(xlsxPath) {
  const zip = new AdmZip(xlsxPath);
  const sharedXml = zip.readAsText("xl/sharedStrings.xml");
  const sheetXml = zip.readAsText("xl/worksheets/sheet1.xml");
  const strings = [...sharedXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
  const rows = [...sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];

  const slugs = new Set();
  for (const row of rows) {
    for (const m of row[1].matchAll(/<v>(\d+)<\/v>/g)) {
      const val = strings[Number(m[1])] || m[1];
      const url = String(val).trim();
      if (!url.includes(".halalresmenu.com")) continue;
      if (url.includes("halalresmenu.com/city")) continue;
      if (url.includes("halalresmenu.com/search")) continue;
      if (url.includes("halalresmenu.com/privacy")) continue;
      if (url.includes("halalresmenu.com/contact")) continue;
      const normalized = url.replace(/\/menu\/?$/i, "/").replace(/\/halal-info\/?$/i, "/");
      const slug = slugFromUrl(normalized);
      if (slug) slugs.add(slug);
    }
  }
  return [...slugs];
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars in .env.local");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function loadProgress() {
  if (!existsSync(PROGRESS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(PROGRESS_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveProgress(summary) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(summary, null, 2));
}

async function main() {
  const { xlsxPath, save, skip } = parseArgs();
  if (!existsSync(xlsxPath)) throw new Error(`File not found: ${xlsxPath}`);

  const slugs = readSlugsFromXlsx(xlsxPath);
  const supabase = createSupabaseClient();

  const summary = loadProgress() || {
    xlsxPath,
    startedAt: new Date().toISOString(),
    slugsInFile: slugs.length,
    completed: [],
    skipped: [],
    failed: [],
    blocked: [],
    missing: [],
  };

  console.log(`XLSX: ${xlsxPath}`);
  console.log(`Restaurant slugs in file: ${slugs.length}`);
  console.log(`Mode: ${save ? "SAVE to Supabase" : "dry run"}`);
  if (skip.size) console.log(`Manual skip: ${[...skip].join(", ")}`);
  console.log("");

  const todo = [];
  for (const slug of slugs) {
    if (skip.has(slug)) {
      summary.skipped.push({ slug, reason: "manual_skip" });
      continue;
    }

    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "id, name, slug, city, address, cuisine_type, price_range, price_level, rating, dine_in, takeaway, delivery, halal_status, google_place_id, menu_data, seo_content"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      summary.missing.push(slug);
      console.log(`MISSING DB: ${slug}`);
      continue;
    }
    if (!data.city?.trim()) {
      summary.blocked.push({ slug, reason: "no_city" });
      console.log(`BLOCKED (no city): ${slug}`);
      continue;
    }
    if (hasMenuData(data.menu_data) && hasSeoContent(data.seo_content)) {
      summary.skipped.push({ slug, reason: "already_has_content" });
      continue;
    }
    todo.push(data);
  }

  const total = todo.length;
  console.log(`To generate: ${total}`);
  console.log(`Already complete: ${summary.skipped.filter((s) => s.reason === "already_has_content").length}`);
  console.log(`Missing from DB: ${summary.missing.length}`);
  console.log("");

  for (let i = 0; i < todo.length; i++) {
    const restaurant = todo[i];
    const index = i + 1;
    const label = `${restaurant.slug} (${restaurant.name})`;

    try {
      const cuisineContext = resolveRestaurantCuisine(restaurant);
      if (cuisineContext.shouldUpdateDb && save) {
        await updateCuisineTypeIfNull(
          supabase,
          restaurant.id,
          cuisineContext.cuisine
        );
        restaurant.cuisine_type = cuisineContext.cuisine;
      }

      console.log(`[${index}/${total}] Generating ${label}…`);
      const { menuData, seoContent, itemCount } = await generateContentWithClaude(
        restaurant,
        cuisineContext
      );

      if (!save) {
        console.log(
          `  DRY RUN OK: ${itemCount} menu items, ${seoContent.faq.length} FAQs`
        );
        summary.completed.push({
          slug: restaurant.slug,
          status: "dry_run",
          items: itemCount,
          faqs: seoContent.faq.length,
        });
        saveProgress(summary);
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
        `[${index}/${total}] SAVED ${label} — ${itemCount} items, ${seoContent.faq.length} FAQs`
      );
      summary.completed.push({
        slug: restaurant.slug,
        status: "saved",
        items: itemCount,
        faqs: seoContent.faq.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[${index}/${total}] FAIL ${label}: ${message}`);
      summary.failed.push({ slug: restaurant.slug, error: message });
    }

    summary.finishedAt = new Date().toISOString();
    saveProgress(summary);
    await sleep(AI_DELAY_MS);
  }

  summary.finishedAt = new Date().toISOString();
  saveProgress(summary);

  console.log("\n========== Done ==========");
  console.log(`Saved/dry-run OK: ${summary.completed.length}`);
  console.log(`Skipped: ${summary.skipped.length}`);
  console.log(`Failed: ${summary.failed.length}`);
  console.log(`Missing DB: ${summary.missing.length}`);
  console.log(`Blocked: ${summary.blocked.length}`);
  console.log(`Progress: ${PROGRESS_PATH}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
