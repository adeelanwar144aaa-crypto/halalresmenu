/**
 * Creates public.restaurants_archive when SUPABASE_DB_URL (or DATABASE_URL) is set.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const url =
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.NEW_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error(
      "Set SUPABASE_DB_URL in .env.local (Supabase → Database → Connection string URI)."
    );
    process.exit(1);
  }

  const sql = fs.readFileSync(
    path.join(__dirname, "migrations", "add-restaurants-archive.sql"),
    "utf8"
  );
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("restaurants_archive migration applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
