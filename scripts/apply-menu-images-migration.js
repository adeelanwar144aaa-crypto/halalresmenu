/**
 * Applies add-menu-images-column.sql when SUPABASE_DB_URL (or DATABASE_URL) is set.
 *
 * Supabase → Project Settings → Database → Connection string (URI, postgres role).
 * Add to .env.local: SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@...
 *
 * Usage: node scripts/apply-menu-images-migration.js
 */

const fs = require("fs");
const path = require("path");
const { config } = require("dotenv");

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const connectionString =
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error(
      "Set SUPABASE_DB_URL in .env.local (Postgres URI from Supabase dashboard), then re-run."
    );
    console.error(
      "Or run scripts/migrations/add-menu-images-column.sql in the Supabase SQL editor."
    );
    process.exit(1);
  }

  let pg;
  try {
    pg = require("pg");
  } catch {
    console.error("Install pg: npm install pg");
    process.exit(1);
  }

  const sqlPath = path.resolve(
    process.cwd(),
    "scripts/migrations/add-menu-images-column.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration applied: menu_images, images_uploaded_at");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
