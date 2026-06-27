/**
 * Import restaurants CSV into Supabase Postgres (direct connection).
 *
 * Usage:
 *   set NEW_DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres
 *   node scripts/import-restaurants-csv.js path/to/restaurants.csv
 *
 * Or:
 *   RESTAURANTS_CSV_PATH=path/to/file.csv node scripts/import-restaurants-csv.js
 *
 * Loads NEW_DATABASE_URL from .env.local if present.
 */

const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const { parse } = require("csv-parse/sync");
const { config } = require("dotenv");
const { readFileSync, existsSync } = require("fs");
const { resolve } = require("path");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const BATCH_SIZE = 100;
const TABLE = "restaurants";

const JSONB_COLUMNS = new Set([
  "photos",
  "reviews",
  "menu_data",
  "seo_content",
  "nearby_mosques",
  "opening_hours",
  "ramadan_hours",
]);

const BOOLEAN_COLUMNS = new Set([
  "alcohol_on_premises",
  "pork_free",
  "muslim_owned",
  "prayer_space",
  "prayer_mat_available",
  "wudu_facilities",
  "family_friendly",
  "party_space",
  "delivery_available",
  "has_takeaway",
  "has_delivery",
  "takeaway_available",
  "dine_in",
  "takeaway",
  "delivery",
  "dine_in_available",
  "reservation_available",
  "catering_available",
  "is_active",
  "is_temporarily_closed",
  "hand_slaughtered",
  "curbside_pickup",
  "outdoor_seating",
  "reservable",
  "serves_breakfast",
  "serves_lunch",
  "serves_dinner",
  "wheelchair_accessible",
  "is_halal_certified",
  "is_alcohol_free",
  "is_pork_free",
  "is_muslim_owned",
  "has_prayer_space",
  "has_wudu_facilities",
  "is_permanently_closed",
  "serves_vegetarian",
  "serves_vegan",
]);

const NUMERIC_COLUMNS = new Set([
  "latitude",
  "longitude",
  "rating",
  "total_reviews",
  "price_level",
  "google_rating",
  "google_total_reviews",
]);

const INTEGER_COLUMNS = new Set([
  "total_reviews",
  "price_level",
  "google_total_reviews",
]);

function trim(value) {
  return String(value ?? "").trim();
}

function isNullLiteral(value) {
  if (value === undefined || value === null) return true;
  const t = trim(value);
  return t === "" || /^null$/i.test(t);
}

function parseBoolean(value) {
  if (isNullLiteral(value)) return null;
  const t = trim(value).toLowerCase();
  if (t === "true" || t === "t" || t === "1" || t === "yes") return true;
  if (t === "false" || t === "f" || t === "0" || t === "no") return false;
  throw new Error(`invalid boolean: ${JSON.stringify(value)}`);
}

function parseNumeric(column, value) {
  if (isNullLiteral(value)) return null;
  const t = trim(value);
  const n = INTEGER_COLUMNS.has(column) ? parseInt(t, 10) : parseFloat(t);
  if (Number.isNaN(n)) {
    throw new Error(`invalid number for ${column}: ${JSON.stringify(value)}`);
  }
  return n;
}

function parseJsonb(value) {
  if (isNullLiteral(value)) return null;
  const t = trim(value);
  if (t === "[]" || t === "{}") {
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(t);
  } catch (err) {
    throw new Error(`invalid JSON: ${err.message}`);
  }
}

function normalizeRow(rawRow) {
  const out = {};
  for (const [key, rawValue] of Object.entries(rawRow)) {
    const column = trim(key).replace(/^\uFEFF/, "");
    if (!column) continue;

    let value = rawValue;
    if (isNullLiteral(value)) {
      out[column] = null;
      continue;
    }

    if (JSONB_COLUMNS.has(column)) {
      out[column] = parseJsonb(value);
    } else if (BOOLEAN_COLUMNS.has(column)) {
      out[column] = parseBoolean(value);
    } else if (NUMERIC_COLUMNS.has(column)) {
      out[column] = parseNumeric(column, value);
    } else {
      out[column] = trim(value);
    }
  }
  return out;
}

function buildInsertStatement(columns) {
  const cols = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(", ");
  const placeholders = columns
    .map((col, i) => {
      const n = i + 1;
      return JSONB_COLUMNS.has(col) ? `$${n}::jsonb` : `$${n}`;
    })
    .join(", ");
  return `INSERT INTO ${TABLE} (${cols}) VALUES (${placeholders})`;
}

function rowValues(columns, row) {
  return columns.map((col) => row[col] ?? null);
}

function resolveCsvPath() {
  const arg = process.argv[2];
  const fromEnv = process.env.RESTAURANTS_CSV_PATH;
  const path = arg || fromEnv;
  if (!path) {
    throw new Error(
      "CSV path required: node scripts/import-restaurants-csv.js <file.csv>"
    );
  }
  const abs = resolve(path);
  if (!existsSync(abs)) {
    throw new Error(`CSV file not found: ${abs}`);
  }
  return abs;
}

async function fetchTableColumnsPg(client) {
  const { rows } = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [TABLE]
  );
  return new Set(rows.map((r) => r.column_name));
}

async function fetchTableColumnsRest(supabaseUrl, serviceKey) {
  const base = supabaseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/openapi+json",
    },
  });
  if (!res.ok) {
    throw new Error(`OpenAPI schema fetch failed: ${res.status} ${res.statusText}`);
  }
  const spec = await res.json();
  const props =
    spec?.definitions?.restaurants?.properties ??
    spec?.components?.schemas?.restaurants?.properties;
  if (!props) {
    throw new Error("Could not read restaurants columns from PostgREST schema.");
  }
  return new Set(Object.keys(props));
}

function pickRow(columns, row) {
  const out = {};
  for (const col of columns) {
    out[col] = row[col] ?? null;
  }
  return out;
}

async function main() {
  const csvPath = resolveCsvPath();
  const databaseUrl = trim(process.env.NEW_DATABASE_URL);
  const supabaseUrl = trim(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = trim(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!databaseUrl && (!supabaseUrl || !serviceKey)) {
    throw new Error(
      "Set NEW_DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  const useRest = !databaseUrl;
  console.log(`CSV: ${csvPath}`);
  console.log(`Target: ${TABLE} via ${useRest ? "Supabase REST (service role)" : "direct Postgres"}\n`);

  const raw = readFileSync(csvPath, "utf8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true,
  });

  if (!records.length) {
    console.log("No data rows in CSV.");
    return;
  }

  const normalized = [];
  const normalizeFailures = [];

  for (let i = 0; i < records.length; i++) {
    try {
      normalized.push(normalizeRow(records[i]));
    } catch (err) {
      normalizeFailures.push({
        rowNumber: i + 2,
        slug: records[i]?.slug ?? records[i]?.Slug ?? "(unknown)",
        error: err.message,
      });
    }
  }

  let client = null;
  let supabase = null;
  let tableColumns;

  if (useRest) {
    supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    tableColumns = await fetchTableColumnsRest(supabaseUrl, serviceKey);
  } else {
    client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    tableColumns = await fetchTableColumnsPg(client);
  }

  console.log(`Target table columns: ${tableColumns.size}\n`);

  const csvColumns = [...new Set(normalized.flatMap((r) => Object.keys(r)))];
  const columns = csvColumns.filter((c) => tableColumns.has(c));
  const skippedColumns = csvColumns.filter((c) => !tableColumns.has(c));

  if (skippedColumns.length) {
    console.log(
      `Skipping ${skippedColumns.length} CSV column(s) not in ${TABLE}: ${skippedColumns.join(", ")}\n`
    );
  }

  if (!columns.length) {
    throw new Error("No overlapping columns between CSV and restaurants table.");
  }

  const insertSql = buildInsertStatement(columns);

  let attempted = 0;
  let succeeded = 0;
  const insertFailures = [];

  for (let start = 0; start < normalized.length; start += BATCH_SIZE) {
    const batch = normalized.slice(start, start + BATCH_SIZE);
    const batchNum = Math.floor(start / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(normalized.length / BATCH_SIZE);

    console.log(
      `Batch ${batchNum}/${totalBatches} — rows ${start + 1}-${start + batch.length}...`
    );

    if (useRest) {
      const payloads = batch.map((row) => pickRow(columns, row));
      const { error } = await supabase.from(TABLE).insert(payloads);
      if (!error) {
        attempted += batch.length;
        succeeded += batch.length;
      } else {
        for (let j = 0; j < batch.length; j++) {
          const row = batch[j];
          const rowNumber = start + j + 2;
          attempted += 1;
          const { error: rowError } = await supabase
            .from(TABLE)
            .insert(pickRow(columns, row));
          if (rowError) {
            insertFailures.push({
              rowNumber,
              slug: row.slug ?? "(unknown)",
              id: row.id ?? null,
              error: rowError.message,
            });
          } else {
            succeeded += 1;
          }
        }
      }
    } else {
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNumber = start + j + 2;
        attempted += 1;

        try {
          await client.query(insertSql, rowValues(columns, row));
          succeeded += 1;
        } catch (err) {
          insertFailures.push({
            rowNumber,
            slug: row.slug ?? "(unknown)",
            id: row.id ?? null,
            error: err.message,
          });
        }
      }
    }

    console.log(
      `  batch done — running total: ${succeeded} ok, ${insertFailures.length} failed`
    );
  }

  if (client) await client.end();

  const failed = normalizeFailures.length + insertFailures.length;

  console.log("\n========== IMPORT SUMMARY ==========");
  console.log(`Rows in CSV:           ${records.length}`);
  console.log(`Normalized OK:         ${normalized.length}`);
  console.log(`Normalize failures:    ${normalizeFailures.length}`);
  console.log(`Insert attempted:      ${attempted}`);
  console.log(`Insert succeeded:      ${succeeded}`);
  console.log(`Insert failed:         ${insertFailures.length}`);
  console.log(`Total failed:          ${failed}`);
  console.log("====================================\n");

  if (normalizeFailures.length) {
    console.log("--- Normalize failures ---");
    for (const f of normalizeFailures.slice(0, 50)) {
      console.log(`  row ${f.rowNumber} (${f.slug}): ${f.error}`);
    }
    if (normalizeFailures.length > 50) {
      console.log(`  ... and ${normalizeFailures.length - 50} more`);
    }
    console.log();
  }

  if (insertFailures.length) {
    console.log("--- Insert failures ---");
    for (const f of insertFailures.slice(0, 50)) {
      console.log(
        `  row ${f.rowNumber} slug=${f.slug} id=${f.id ?? "n/a"}: ${f.error}`
      );
    }
    if (insertFailures.length > 50) {
      console.log(`  ... and ${insertFailures.length - 50} more`);
    }
  }

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
