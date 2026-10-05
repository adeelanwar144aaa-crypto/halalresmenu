/**
 * Export all restaurants to scripts/all-restaurants.csv
 * Run: node scripts/export-all-restaurants-csv.js
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const PAGE = 1000;
const OUT = resolve(process.cwd(), "scripts/all-restaurants.csv");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function menuStatus(menuData) {
  if (menuData == null) return "No menu";
  const source =
    typeof menuData === "object" && menuData !== null
      ? String(menuData.source || "").trim()
      : "";
  if (source === "ai_generated") return "AI menu (needs replacing)";
  return "Real menu";
}

function csvCell(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function fetchAll() {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("slug, name, city, cuisine_type, menu_data")
      .order("city", { ascending: true })
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return rows;
}

async function main() {
  console.log("Fetching restaurants…");
  const rows = await fetchAll();

  const lines = ["slug,name,city,cuisine_type,menu_status"];
  const cityCounts = new Map();
  let noMenu = 0;
  let aiMenu = 0;
  let realMenu = 0;

  for (const r of rows) {
    const status = menuStatus(r.menu_data);
    lines.push(
      [
        csvCell(r.slug),
        csvCell(r.name),
        csvCell(r.city),
        csvCell(r.cuisine_type),
        csvCell(status),
      ].join(",")
    );

    const city = String(r.city || "Unknown").trim() || "Unknown";
    cityCounts.set(city, (cityCounts.get(city) || 0) + 1);

    if (status === "No menu") noMenu++;
    else if (status === "AI menu (needs replacing)") aiMenu++;
    else realMenu++;
  }

  writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
  console.log(`Saved ${rows.length} rows to ${OUT}\n`);

  console.log(`Total restaurants: ${rows.length}`);
  console.log("\nTop 10 cities:");
  const topCities = [...cityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [city, count] of topCities) {
    console.log(`  ${city}: ${count}`);
  }

  console.log("\nMenu status:");
  console.log(`  No menu:                    ${noMenu}`);
  console.log(`  AI menu (needs replacing):  ${aiMenu}`);
  console.log(`  Real menu:                  ${realMenu}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
