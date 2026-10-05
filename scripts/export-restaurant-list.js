/**
 * Export restaurants by city into checklist .txt files for manual menu collection.
 *
 * Usage:
 *   node scripts/export-restaurant-list.js
 *   node scripts/export-restaurant-list.js --city london
 *   node scripts/export-restaurant-list.js --no-menu-only
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve, join } = require("path");
const { mkdirSync, writeFileSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const PAGE = 1000;
const OUT_DIR = resolve(process.cwd(), "scripts/restaurant-lists");

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(`--${flag}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : null;
};
const hasFlag = (flag) => args.includes(`--${flag}`);

const CITY_FILTER = getArg("city");
const NO_MENU_ONLY = hasFlag("no-menu-only");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function slugifyCity(cityName) {
  return String(cityName || "unknown")
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function citySlugToPattern(citySlug) {
  const term = citySlug.replace(/-/g, " ").trim();
  return `%${term}%`;
}

function menuStatus(menuData) {
  if (menuData == null) return "No menu";
  const source =
    typeof menuData === "object" && menuData !== null && menuData.source
      ? String(menuData.source).trim()
      : "";
  if (source === "ai_generated") return "HAS MENU (ai_generated)";
  if (source) return `HAS MENU (${source})`;
  return "HAS MENU (unknown)";
}

function countByMenuType(restaurants) {
  let noMenu = 0;
  let aiMenu = 0;
  let realMenu = 0;

  for (const r of restaurants) {
    if (r.menu_data == null) {
      noMenu++;
    } else if (r.menu_data?.source === "ai_generated") {
      aiMenu++;
    } else {
      realMenu++;
    }
  }

  return { noMenu, aiMenu, realMenu };
}

async function fetchAllRestaurants() {
  const rows = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("restaurants")
      .select("slug, name, city, cuisine_type, menu_data")
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);

    if (CITY_FILTER) {
      query = query.ilike("city", citySlugToPattern(CITY_FILTER));
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Supabase fetch failed: ${error.message}`);
    }
    if (!data?.length) break;

    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (NO_MENU_ONLY) {
    return rows.filter((r) => r.menu_data == null);
  }

  return rows;
}

function groupByCity(restaurants) {
  const byCity = new Map();

  for (const r of restaurants) {
    const cityName = String(r.city || "").trim() || "Unknown";
    if (!byCity.has(cityName)) byCity.set(cityName, []);
    byCity.get(cityName).push(r);
  }

  for (const list of byCity.values()) {
    list.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      })
    );
  }

  return byCity;
}

function formatRestaurantBlock(r) {
  const name = String(r.name || "Unnamed").trim();
  const cuisine = String(r.cuisine_type || "Unknown").trim();
  const status = menuStatus(r.menu_data);
  return `=== ${r.slug} ===\n${name} | ${cuisine} | ${status}\n`;
}

function formatCityFile(cityName, restaurants) {
  const { noMenu } = countByMenuType(restaurants);
  const lines = [
    `${cityName} — ${restaurants.length} restaurants (${noMenu} without menu)`,
    "================================================",
    "",
  ];

  for (const r of restaurants) {
    lines.push(formatRestaurantBlock(r));
  }

  return lines.join("\n");
}

function padRight(str, width) {
  const s = String(str);
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function formatSummary(allRestaurants, byCity) {
  const cityStats = [];

  for (const [cityName, restaurants] of byCity.entries()) {
    const counts = countByMenuType(restaurants);
    cityStats.push({
      cityName,
      total: restaurants.length,
      ...counts,
    });
  }

  cityStats.sort((a, b) => b.total - a.total);

  const totals = countByMenuType(allRestaurants);

  const lines = [
    `Total restaurants: ${allRestaurants.length}`,
    `Cities: ${byCity.size}`,
    "",
    "City                    Total   No menu   AI menu   Real menu",
    "─────────────────────────────────────────────────────────────",
  ];

  for (const row of cityStats) {
    lines.push(
      `${padRight(row.cityName, 24)}${padRight(row.total, 8)}${padRight(row.noMenu, 10)}${padRight(row.aiMenu, 10)}${row.realMenu}`
    );
  }

  lines.push("");
  lines.push(
    `${padRight("TOTAL", 24)}${padRight(allRestaurants.length, 8)}${padRight(totals.noMenu, 10)}${padRight(totals.aiMenu, 10)}${totals.realMenu}`
  );

  return lines.join("\n");
}

async function main() {
  console.log("Fetching restaurants from Supabase…");
  if (CITY_FILTER) console.log(`  City filter: ${CITY_FILTER}`);
  if (NO_MENU_ONLY) console.log("  No-menu-only: yes");

  const restaurants = await fetchAllRestaurants();
  console.log(`  Loaded ${restaurants.length} restaurants`);

  const byCity = groupByCity(restaurants);
  mkdirSync(OUT_DIR, { recursive: true });

  for (const [cityName, cityRestaurants] of byCity.entries()) {
    const filename = `${slugifyCity(cityName)}.txt`;
    const path = join(OUT_DIR, filename);
    writeFileSync(path, formatCityFile(cityName, cityRestaurants), "utf8");
    console.log(`  Wrote ${filename} (${cityRestaurants.length} restaurants)`);
  }

  const summaryPath = join(OUT_DIR, "_summary.txt");
  writeFileSync(summaryPath, formatSummary(restaurants, byCity), "utf8");
  console.log(`  Wrote _summary.txt`);
  console.log(`\nDone. Files in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
