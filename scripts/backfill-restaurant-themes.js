/**
 * Backfill primary_color, background_color, accent_color for all restaurants.
 * Run migration scripts/migrations/add-restaurant-theme-columns.sql first.
 * Run: npm run backfill-restaurant-themes
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or anon key) in .env.local
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const {
  generateRestaurantTheme,
  assertPaletteAccessibility,
} = require("../lib/restaurant-theme.ts");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 80;
const FORCE = process.argv.includes("--force");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  const key =
    serviceKey && serviceKey.length > 20 && !serviceKey.includes("your-")
      ? serviceKey
      : anonKey;

  console.log(
    key === serviceKey
      ? "Using SUPABASE_SERVICE_ROLE_KEY for writes."
      : "Using anon key (set SUPABASE_SERVICE_ROLE_KEY if RLS blocks writes)."
  );

  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function fetchAllRestaurants(supabase) {
  const all = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "id, name, slug, cuisine_type, primary_color, background_color, accent_color"
      )
      .order("id", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      throw new Error(`restaurants fetch: ${error.message}`);
    }

    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return all;
}

async function main() {
  const access = assertPaletteAccessibility();
  if (!access.ok) {
    console.error("Palette failed WCAG AA checks:");
    access.failures.forEach((f) => console.error(" ", f));
    process.exit(1);
  }
  console.log(
    `Palette OK (${access.failures.length === 0 ? "all" : "n/a"} pairs pass WCAG AA).`
  );

  const supabase = createSupabaseClient();
  const rows = await fetchAllRestaurants(supabase);
  console.log(`Loaded ${rows.length} restaurants. FORCE=${FORCE}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (row) => {
        const hasAll =
          row.primary_color && row.background_color && row.accent_color;
        if (hasAll && !FORCE) {
          skipped += 1;
          return;
        }

        const theme = generateRestaurantTheme({
          name: row.name,
          cuisine_type: row.cuisine_type,
          slug: row.slug,
        });

        const { error } = await supabase
          .from("restaurants")
          .update({
            primary_color: theme.primary_color,
            background_color: theme.background_color,
            accent_color: theme.accent_color,
          })
          .eq("id", row.id);

        if (error) {
          failed += 1;
          console.error(`Failed ${row.slug || row.id}: ${error.message}`);
          return;
        }
        updated += 1;
      })
    );

    console.log(
      `Progress ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} (updated=${updated}, skipped=${skipped}, failed=${failed})`
    );
    if (i + BATCH_SIZE < rows.length) await sleep(BATCH_DELAY_MS);
  }

  console.log(
    `Done. updated=${updated} skipped=${skipped} failed=${failed}`
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
