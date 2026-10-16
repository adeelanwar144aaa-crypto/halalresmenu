/**
 * Run supabase-quota-cleanup.sql when SUPABASE_DB_URL is set.
 * Prints table sizes before/after.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const SIZE_SQL = `
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;
SELECT c.relname AS table_name,
  pg_total_relation_size(c.oid) AS total_bytes,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY pg_total_relation_size(c.oid) DESC;
`;

async function runSizes(client, label) {
  console.log(`\n=== ${label} ===`);
  const db = await client.query(
    "SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size"
  );
  console.log("database_size:", db.rows[0].database_size);
  const tables = await client.query(`
    SELECT c.relname AS table_name,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 20
  `);
  console.table(tables.rows);
}

async function main() {
  const url =
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.NEW_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("Set SUPABASE_DB_URL in .env.local to run DDL + VACUUM.");
    process.exit(1);
  }

  const sqlPath = path.join(
    __dirname,
    "migrations",
    "supabase-quota-cleanup.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  await runSizes(client, "BEFORE");
  await client.query(sql);
  await runSizes(client, "AFTER");
  await client.end();
  console.log("\nCleanup SQL applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
