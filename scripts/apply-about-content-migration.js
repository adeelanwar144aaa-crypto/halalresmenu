/**
 * Applies add-about-content-columns.sql (+ backup columns) when SUPABASE_DB_URL is set.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const url =
    process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) {
    console.log(
      "Set SUPABASE_DB_URL in .env.local, then re-run. Or paste scripts/migrations/add-about-content-columns.sql in Supabase SQL editor."
    );
    process.exit(1);
  }

  const files = [
    "add-photos-menu-backup-columns.sql",
    "add-about-content-columns.sql",
  ];

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  for (const file of files) {
    const sql = fs.readFileSync(
      path.join(__dirname, "migrations", file),
      "utf8"
    );
    await client.query(sql);
    console.log("Applied", file);
  }
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
