/**
 * GSC-aware restaurant cleanup: plan, backup, delete, generate redirects.
 *
 *   npx tsx scripts/run-gsc-cleanup.ts           # dry-run plan only
 *   npx tsx scripts/run-gsc-cleanup.ts --execute # backup + delete
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";
import { resolveCanonicalCitySlug, slugifyCity } from "@/lib/city-slug";
import { loadGscIndexedSlugs } from "@/lib/gsc-indexed-slugs";
import { classifyRestaurantReady } from "@/lib/restaurant-ready";
import { getApexOrigin } from "@/lib/sitemap-data";
import { cityHubPath } from "@/lib/city-slug";
import type { Restaurant } from "@/types/restaurant";

const EXECUTE = process.argv.includes("--execute");
const DATA_DIR = join(process.cwd(), "scripts", "data");
const LOG_DIR = join(process.cwd(), "scripts", "logs");
const BACKUP_DIR = join(process.cwd(), "scripts", "backups");

type Row = Restaurant;

function csvEscape(s: string): string {
  return `"${String(s).replace(/"/g, '""')}"`;
}

function dbUrl(): string | null {
  return (
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.NEW_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    null
  );
}

async function fetchAllRestaurants(supabase: SupabaseClient): Promise<Row[]> {
  const rows: Row[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return rows;
}

function cleanupApexOrigin(): string {
  const fromEnv = getApexOrigin();
  if (!/localhost|127\.0\.0\.1/i.test(fromEnv)) return fromEnv;
  return "https://halalresmenu.com";
}

function redirectForDeletedSlug(
  cityRaw: string | null | undefined,
  cityHasKept: boolean
): string {
  const apex = cleanupApexOrigin();
  if (cityRaw?.trim() && cityHasKept) {
    const slug = resolveCanonicalCitySlug(slugifyCity(cityRaw.trim()));
    return `${apex}${cityHubPath(slug)}`;
  }
  return apex.endsWith("/") ? apex.slice(0, -1) : apex;
}

function writeRedirectAssets(redirects: Record<string, string>): void {
  const jsonPath = join(process.cwd(), "public", "deleted-redirects.json");
  writeFileSync(jsonPath, JSON.stringify(redirects), "utf8");
  const tsPath = join(process.cwd(), "lib", "deleted-restaurant-redirects.generated.ts");
  writeFileSync(
    tsPath,
    `/** Redirects live in public/deleted-redirects.json (${Object.keys(redirects).length} slugs). */\nexport const GENERATED_DELETED_REDIRECTS: Record<string, string> = {};\n`,
    "utf8"
  );
}

async function ensureArchiveTablePg(): Promise<boolean> {
  const url = dbUrl();
  if (!url) return false;
  const sql = await import("fs/promises").then((fs) =>
    fs.readFile(
      join(process.cwd(), "scripts", "migrations", "add-restaurants-archive.sql"),
      "utf8"
    )
  );
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  return true;
}

async function archiveAndDeletePg(deleteRows: Row[]): Promise<number> {
  const url = dbUrl();
  if (!url) throw new Error("SUPABASE_DB_URL required for archive table insert");
  const ids = deleteRows.map((r) => r.id);
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("BEGIN");
    const childTables = [
      "menu_items",
      "menu_categories",
      "restaurant_photos",
      "reviews",
      "generated_content",
      "nearby_mosques",
    ];
    for (const table of childTables) {
      await client.query(
        `DELETE FROM ${table} WHERE restaurant_id = ANY($1::uuid[])`,
        [ids]
      ).catch(() => undefined);
    }
    const insert = await client.query(
      `INSERT INTO restaurants_archive
       SELECT r.*, NOW() AS deleted_at
       FROM restaurants r
       WHERE r.id = ANY($1::uuid[])`,
      [ids]
    );
    const archived = insert.rowCount ?? 0;
    const del = await client.query(
      `DELETE FROM restaurants WHERE id = ANY($1::uuid[])`,
      [ids]
    );
    const deleted = del.rowCount ?? 0;
    if (archived !== deleteRows.length || deleted !== deleteRows.length) {
      await client.query("ROLLBACK");
      throw new Error(
        `Archive/delete count mismatch: archived=${archived} deleted=${deleted} expected=${deleteRows.length}`
      );
    }
    await client.query("COMMIT");
    return archived;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

async function archiveTableReady(supabase: SupabaseClient): Promise<boolean> {
  const probe = await supabase.from("restaurants_archive").select("id").limit(1);
  if (!probe.error) return true;
  const msg = probe.error.message ?? "";
  return !(
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    probe.error.code === "PGRST205"
  );
}

async function archiveAndDeleteRest(
  supabase: SupabaseClient,
  deleteRows: Row[],
  jsonPath: string
): Promise<number> {
  let archived = 0;
  const useTable = await archiveTableReady(supabase);
  if (useTable) {
    const chunkSize = 50;
    for (let i = 0; i < deleteRows.length; i += chunkSize) {
      const chunk = deleteRows.slice(i, i + chunkSize).map((r) => ({
        ...r,
        deleted_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("restaurants_archive").insert(chunk);
      if (error) {
        throw new Error(`restaurants_archive insert: ${error.message}`);
      }
      archived += chunk.length;
    }
  } else {
    console.warn(
      "restaurants_archive table missing — JSON backup counts as archive for this run. Apply scripts/migrations/add-restaurants-archive.sql in Supabase SQL editor, then backfill from JSON if needed."
    );
    archived = deleteRows.length;
  }

  const ids = deleteRows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    for (const table of [
      "menu_items",
      "menu_categories",
      "restaurant_photos",
      "reviews",
      "generated_content",
      "nearby_mosques",
    ]) {
      await supabase.from(table).delete().in("restaurant_id", chunk);
    }
    const { error } = await supabase.from("restaurants").delete().in("id", chunk);
    if (error) throw error;
  }

  if (archived !== deleteRows.length) {
    throw new Error(`Archive count ${archived} !== delete ${deleteRows.length}`);
  }
  return archived;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const gsc = loadGscIndexedSlugs(DATA_DIR);
  console.log("=== GSC indexed URLs ===");
  console.log("Files:", gsc.files.join(", ") || "(none)");
  for (const w of gsc.sheetWarnings) console.warn("WARN:", w);
  console.log({
    totalIndexedUrls: gsc.totalIndexedUrls,
    uniqueRestaurantSlugs: gsc.restaurantSlugs.size,
  });

  const allRows = await fetchAllRestaurants(supabase);
  const dbSlugs = new Set(allRows.map((r) => r.slug?.toLowerCase()).filter(Boolean));
  const notInDb = [...gsc.restaurantSlugs].filter((s) => !dbSlugs.has(s));
  if (notInDb.length) {
    console.log("Indexed slugs not in DB:", notInDb.slice(0, 20).join(", "), notInDb.length > 20 ? `…+${notInDb.length - 20}` : "");
  }

  type Classified = Row & { flags: ReturnType<typeof classifyRestaurantReady>; indexed: boolean; keep: boolean };
  const classified: Classified[] = allRows.map((row) => {
    const flags = classifyRestaurantReady(row);
    const indexed = gsc.restaurantSlugs.has(row.slug.toLowerCase());
    const keep = flags.ready || indexed;
    return { ...row, flags, indexed, keep };
  });

  const keepRows = classified.filter((c) => c.keep);
  const deleteRows = classified.filter((c) => !c.keep);
  const readyRows = classified.filter((c) => c.flags.ready);
  const keepIndexed = classified.filter((c) => c.indexed && !c.flags.ready);

  const keepByCity = new Map<string, number>();
  for (const r of keepRows) {
    const slug = resolveCanonicalCitySlug(slugifyCity(r.city?.trim() || "")) || "(no city)";
    keepByCity.set(slug, (keepByCity.get(slug) ?? 0) + 1);
  }
  const emptyCities = [...new Set(allRows.map((r) => resolveCanonicalCitySlug(slugifyCity(r.city?.trim() || ""))).filter(Boolean))].filter(
    (citySlug) => (keepByCity.get(citySlug) ?? 0) === 0
  );

  console.log("\n=== Cleanup plan (GSC rule) ===");
  console.log({
    total: allRows.length,
    READY: readyRows.length,
    KEEP_INDEXED: keepIndexed.length,
    KEEP_total: keepRows.length,
    DELETE: deleteRows.length,
  });

  console.log("\nKEEP-INDEXED missing breakdown:");
  console.log({
    missing_photos: keepIndexed.filter((r) => r.flags.missingPhotos).length,
    missing_menu: keepIndexed.filter((r) => r.flags.missingMenu).length,
    missing_content: keepIndexed.filter((r) => r.flags.missingContent).length,
  });

  console.log(`\nCities empty after cleanup: ${emptyCities.length}`);
  console.log(emptyCities.sort().join(", "));

  mkdirSync(LOG_DIR, { recursive: true });
  writeFileSync(
    join(LOG_DIR, "cleanup-plan.csv"),
    [
      "id,slug,name,city,ready,indexed,action,reason",
      ...classified.map((c) =>
        [
          csvEscape(String(c.id)),
          csvEscape(c.slug),
          csvEscape(c.name ?? ""),
          csvEscape(c.city ?? ""),
          c.flags.ready ? "yes" : "no",
          c.indexed ? "yes" : "no",
          c.keep ? "KEEP" : "DELETE",
          csvEscape(c.flags.missingLabel),
        ].join(",")
      ),
    ].join("\n") + "\n",
    "utf8"
  );

  writeFileSync(
    join(LOG_DIR, "indexed-not-ready.csv"),
    [
      "slug,name,city,missing",
      ...keepIndexed.map((c) =>
        [
          csvEscape(c.slug),
          csvEscape(c.name ?? ""),
          csvEscape(c.city ?? ""),
          csvEscape(c.flags.missingLabel),
        ].join(",")
      ),
    ].join("\n") + "\n",
    "utf8"
  );

  if (!EXECUTE) {
    console.log("\nDry run only. Re-run with --execute to backup and delete.");
    return;
  }

  console.log("\n=== EXECUTE: backup + delete ===");
  const redirects: Record<string, string> = {};
  for (const row of deleteRows) {
    const citySlug = resolveCanonicalCitySlug(slugifyCity(row.city?.trim() || ""));
    const cityHasKept = citySlug ? (keepByCity.get(citySlug) ?? 0) > 0 : false;
    redirects[row.slug.toLowerCase()] = redirectForDeletedSlug(row.city, cityHasKept);
  }
    writeRedirectAssets(redirects);

  const date = new Date().toISOString().slice(0, 10);
  mkdirSync(BACKUP_DIR, { recursive: true });
  const jsonPath = join(BACKUP_DIR, `restaurants-deleted-${date}.json`);
  writeFileSync(jsonPath, JSON.stringify(deleteRows, null, 0), "utf8");
  console.log("JSON backup:", jsonPath, deleteRows.length, "rows");

  let archived = 0;
  if (dbUrl()) {
    await ensureArchiveTablePg();
    archived = await archiveAndDeletePg(deleteRows);
  } else {
    archived = await archiveAndDeleteRest(supabase, deleteRows, jsonPath);
  }

  const { count: remaining } = await supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true });
  const archiveProbe = await supabase
    .from("restaurants_archive")
    .select("id", { count: "exact", head: true });
  const archiveCount = archiveProbe.error ? null : archiveProbe.count;

  console.log({
    archived,
    archiveTableCount: archiveCount,
    restaurantsRemaining: remaining,
    expectedKeep: keepRows.length,
  });

  if (remaining !== keepRows.length) {
    throw new Error(`Remaining count ${remaining} !== expected KEEP ${keepRows.length}`);
  }
  if (archiveCount != null && archived > 0 && archiveCount < archived) {
    console.warn("Archive table total may include prior rows; this run archived", archived);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
