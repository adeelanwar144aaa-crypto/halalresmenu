import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { buildRestaurantSchemaGraph } from "@/components/seo/SchemaMarkup";
import { getMenuSchemaSample, parseMenuData } from "@/lib/menu-data";
import { fetchRestaurantBySlug } from "@/lib/supabase";
import { getApexOrigin } from "@/lib/sitemap-data";
import { restaurantSubdomainUrl } from "@/lib/utils";

const slugs =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : ["7-spices", "anoki-derby", "sam-s-chicken-croydon"];

async function main() {
const site = getApexOrigin();

for (const slug of slugs) {
  const row = await fetchRestaurantBySlug(slug);
  if (!row) {
    console.log(`\n# ${slug}: not found\n`);
    continue;
  }
  const url = restaurantSubdomainUrl(slug);
  const menuData = parseMenuData(row.menu_data);
  const schema = buildRestaurantSchemaGraph({
    restaurant: row,
    url,
    breadcrumbs: [
      { name: "Home", url: site },
      { name: row.name, url },
    ],
    menuSample: getMenuSchemaSample(menuData),
    menuData,
    includeFaq: true,
  });
  console.log(`\n# ${slug}\n`);
  console.log(JSON.stringify(schema, null, 2));
}
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
