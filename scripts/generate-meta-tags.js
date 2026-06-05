/**
 * Generate SEO meta tags for all restaurants → Supabase.
 * Run migration scripts/migrations/add-meta-tags-columns.sql first.
 * Run: npm run generate-meta-tags
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or anon key) in .env.local
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 100;

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
 * @param {string} name
 * @param {string | null | undefined} city
 */
function generateMetaTags(name, city) {
  const cityLabel = String(city || "").trim() || "the UK";

  return {
    meta_title: `${name} | Halal Restaurant Overview`,
    meta_description: `Discover ${name}, a halal restaurant in ${cityLabel}. View menu, reviews, opening hours and halal certification details.`,
    menu_meta_title: `${name} | Menu & Prices Updated 2026`,
    menu_meta_description: `View the full halal menu and prices at ${name} in ${cityLabel}. Browse all dishes, categories and updated prices for 2026.`,
  };
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
      .select("id, name, city")
      .order("id", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      throw new Error(`restaurants fetch: ${error.message}`);
    }

    if (!data?.length) break;
    all.push(...data);
    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return all;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 * @param {object} metaTags
 */
async function updateRestaurantMeta(supabase, id, metaTags) {
  const { error } = await supabase
    .from("restaurants")
    .update({
      meta_title: metaTags.meta_title,
      meta_description: metaTags.meta_description,
      menu_meta_title: metaTags.menu_meta_title,
      menu_meta_description: metaTags.menu_meta_description,
    })
    .eq("id", id);

  if (error) {
    const message = error.message || "";
    if (
      /meta_title|meta_description|menu_meta_title|menu_meta_description/i.test(
        message
      ) &&
      (/column/i.test(message) || /schema cache/i.test(message))
    ) {
      throw new Error(
        "Meta tag columns missing. Run scripts/migrations/add-meta-tags-columns.sql in the Supabase SQL editor."
      );
    }
    throw new Error(`update id=${id}: ${message}`);
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object[]} rows
 */
async function updateBatch(supabase, rows) {
  await Promise.all(
    rows.map((row) =>
      updateRestaurantMeta(supabase, row.id, generateMetaTags(row.name, row.city))
    )
  );
}

async function main() {
  const supabase = createSupabaseClient();

  console.log("Fetching all restaurants...");
  const restaurants = await fetchAllRestaurants(supabase);
  const total = restaurants.length;

  if (total === 0) {
    console.log("No restaurants found.");
    return;
  }

  console.log(`Found ${total} restaurants. Generating meta tags...\n`);

  let updated = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = restaurants.slice(i, i + BATCH_SIZE);
    await updateBatch(supabase, batch);

    for (const row of batch) {
      updated += 1;
      console.log(`[${updated}/${total}] ${row.name} - Done`);
    }

    if (i + BATCH_SIZE < total) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`\nSummary: ${updated} restaurants updated with meta tags.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
