/**
 * Preview or save Claude Haiku menu + SEO for one restaurant slug.
 * Reuses prompt/call pattern from menu-scraper-smart.js.
 *
 * Usage:
 *   node scripts/generate-content-preview.js --slug=jodpur-lounge
 *   node scripts/generate-content-preview.js --slug=jodpur-lounge --save
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const {
  buildUserPrompt,
  generateContentWithClaude,
  hasMenuData,
  hasSeoContent,
  resolveRestaurantCuisine,
} = require("./menu-scraper-smart");

function parseArgs() {
  const slugArg = process.argv.find((a) => a.startsWith("--slug="));
  const slug = slugArg?.split("=")[1]?.trim();
  const save = process.argv.includes("--save");
  if (!slug) {
    throw new Error("Usage: node scripts/generate-content-preview.js --slug=your-slug [--save]");
  }
  return { slug, save };
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars in .env.local");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function main() {
  const { slug, save } = parseArgs();
  const supabase = createSupabaseClient();

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select(
      "id, name, slug, city, address, cuisine_type, price_range, price_level, rating, dine_in, takeaway, delivery, google_place_id, menu_data, seo_content"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!restaurant) throw new Error(`Restaurant not found: ${slug}`);

  if (hasMenuData(restaurant.menu_data) && hasSeoContent(restaurant.seo_content)) {
    console.log(`SKIP: ${slug} already has menu_data and seo_content`);
    process.exit(0);
  }

  if (!restaurant.city?.trim()) {
    throw new Error(`Missing city for ${slug} — stopping instead of inventing facts`);
  }

  const cuisineContext = resolveRestaurantCuisine(restaurant);
  console.log(`Generating for: ${restaurant.name} (${slug})`);
  console.log(`City: ${restaurant.city} | Cuisine: ${cuisineContext.cuisine}`);

  const { menuData, seoContent, itemCount } = await generateContentWithClaude(
    restaurant,
    cuisineContext
  );

  const preview = {
    slug,
    name: restaurant.name,
    city: restaurant.city,
    cuisine: cuisineContext.cuisine,
    menuCategories: menuData.categories.length,
    menuItems: itemCount,
    seo: seoContent,
  };

  const outPath = resolve(process.cwd(), `preview-${slug}.json`);
  writeFileSync(outPath, JSON.stringify(preview, null, 2));
  console.log(`\nPreview written to ${outPath}\n`);
  console.log(JSON.stringify(preview, null, 2));

  if (save) {
    const update = { updated_at: new Date().toISOString() };
    if (!hasMenuData(restaurant.menu_data)) update.menu_data = menuData;
    if (!hasSeoContent(restaurant.seo_content)) update.seo_content = seoContent;

    const { error: saveError } = await supabase
      .from("restaurants")
      .update(update)
      .eq("id", restaurant.id);

    if (saveError) throw new Error(saveError.message);
    console.log(`\nSaved to Supabase for ${slug}`);
  } else {
    console.log("\nDry run only — re-run with --save to write to Supabase.");
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
