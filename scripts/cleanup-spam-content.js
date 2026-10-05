/**
 * Removes AI-generated content that triggered the August 2026 spam update:
 *   1. seo_content JSONB → null  (AI descriptions + FAQs)
 *   2. meta_title, meta_description → null
 *   3. menu_meta_title, menu_meta_description → null
 *   4. menu_data where source = 'ai_generated' → null
 *
 * Usage:
 *   node scripts/cleanup-spam-content.js --dry-run
 *   node scripts/cleanup-spam-content.js
 *   node scripts/cleanup-spam-content.js --keep-menus
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DRY_RUN = process.argv.includes("--dry-run");
const KEEP_MENUS = process.argv.includes("--keep-menus");
const BATCH = 500;
const PAGE = 1000;

async function countWhere(column) {
  const { count, error } = await supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true })
    .not(column, "is", null);

  if (error) return `error: ${error.message}`;
  return count;
}

async function fetchAllRows(select, filter) {
  const rows = [];
  let from = 0;

  while (true) {
    let query = supabase.from("restaurants").select(select).range(from, from + PAGE - 1);
    if (filter) query = filter(query);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return rows;
}

async function batchNullify(column) {
  const rows = await fetchAllRows("id", (q) => q.not(column, "is", null));
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return 0;

  let updated = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batchIds = ids.slice(i, i + BATCH);
    const { error: updateErr } = await supabase
      .from("restaurants")
      .update({ [column]: null, updated_at: new Date().toISOString() })
      .in("id", batchIds);

    if (updateErr) {
      console.error(`  Batch error (${column}): ${updateErr.message}`);
    } else {
      updated += batchIds.length;
    }
  }

  return updated;
}

async function clearAIMenus() {
  const rows = await fetchAllRows("id, menu_data", (q) =>
    q.not("menu_data", "is", null)
  );

  const aiMenuIds = rows
    .filter((r) => r.menu_data?.source === "ai_generated")
    .map((r) => r.id);

  if (aiMenuIds.length === 0) return { count: 0, updated: 0 };

  let updated = 0;
  for (let i = 0; i < aiMenuIds.length; i += BATCH) {
    const batchIds = aiMenuIds.slice(i, i + BATCH);
    const { error: updateErr } = await supabase
      .from("restaurants")
      .update({ menu_data: null, updated_at: new Date().toISOString() })
      .in("id", batchIds);

    if (!updateErr) updated += batchIds.length;
  }

  return { count: aiMenuIds.length, updated };
}

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   HalalResMenu — Spam Content Cleanup           ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN (preview only)" : "LIVE — will modify database"}`);
  console.log(`  Keep AI menus: ${KEEP_MENUS}`);
  console.log("");

  console.log("── Current state ─────────────────────────────────");

  const seoCount = await countWhere("seo_content");
  const metaTitleCount = await countWhere("meta_title");
  const metaDescCount = await countWhere("meta_description");
  const menuMetaTitleCount = await countWhere("menu_meta_title");
  const menuMetaDescCount = await countWhere("menu_meta_description");

  const menuRows = await fetchAllRows("menu_data", (q) =>
    q.not("menu_data", "is", null)
  );
  const aiMenuCount = menuRows.filter((r) => r.menu_data?.source === "ai_generated").length;
  const realMenuCount = menuRows.filter(
    (r) => r.menu_data?.source && r.menu_data.source !== "ai_generated"
  ).length;

  console.log(`  seo_content (AI descriptions + FAQ):  ${seoCount} records`);
  console.log(`  meta_title:                           ${metaTitleCount} records`);
  console.log(`  meta_description:                     ${metaDescCount} records`);
  console.log(`  menu_meta_title:                      ${menuMetaTitleCount} records`);
  console.log(`  menu_meta_description:                ${menuMetaDescCount} records`);
  console.log(`  menu_data (AI-generated):             ${aiMenuCount} records`);
  console.log(`  menu_data (real/website):              ${realMenuCount} records`);
  console.log("");

  if (DRY_RUN) {
    console.log("── Dry run — no changes made ──────────────────────");
    console.log("  Would clear:");
    console.log(`    • ${seoCount} seo_content records (AI about_section + FAQ)`);
    console.log(`    • ${metaTitleCount} meta_title records`);
    console.log(`    • ${metaDescCount} meta_description records`);
    console.log(`    • ${menuMetaTitleCount} menu_meta_title records`);
    console.log(`    • ${menuMetaDescCount} menu_meta_description records`);
    if (!KEEP_MENUS) {
      console.log(`    • ${aiMenuCount} AI-generated menu_data records`);
    }
    console.log("\n  Would preserve:");
    console.log(`    • ${realMenuCount} real menu_data records`);
    console.log("    • description column (short template text, not AI spam)");
    console.log("\n  Run without --dry-run to execute.");
    return;
  }

  console.log("── Cleaning ──────────────────────────────────────");

  process.stdout.write("  Clearing seo_content...");
  console.log(` ${await batchNullify("seo_content")} done`);

  process.stdout.write("  Clearing meta_title...");
  console.log(` ${await batchNullify("meta_title")} done`);

  process.stdout.write("  Clearing meta_description...");
  console.log(` ${await batchNullify("meta_description")} done`);

  process.stdout.write("  Clearing menu_meta_title...");
  console.log(` ${await batchNullify("menu_meta_title")} done`);

  process.stdout.write("  Clearing menu_meta_description...");
  console.log(` ${await batchNullify("menu_meta_description")} done`);

  if (!KEEP_MENUS) {
    process.stdout.write("  Clearing AI-generated menu_data...");
    const { updated } = await clearAIMenus();
    console.log(` ${updated} done`);
  } else {
    console.log("  Skipping AI menu_data (--keep-menus flag)");
  }

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   Cleanup complete                               ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log("  Next: npm run fetch-real-menus -- --limit 50 --dry-run");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
