/**
 * Site-wide structured data audit for all restaurant listings.
 * Usage: npx tsx scripts/validate-schema.ts [--json]
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import type { Restaurant } from "@/types/restaurant";
import {
  auditRestaurantRow,
  summarizeAudits,
  type SchemaAuditSummary,
} from "@/lib/schema-audit";
import { parseMenuData } from "@/lib/menu-data";
import { isSubdomainSafeSlug } from "@/lib/subdomain-slug";
import { getSupabaseServer } from "@/lib/supabase";
import { SupabaseUnavailableError } from "@/lib/supabase-unavailable";

const PAGE_SIZE = 500;

const RESTAURANT_SELECT =
  "slug, name, phone, address, city, country, postcode, latitude, longitude, opening_hours, photos, menu_data, rating, total_reviews, website, cuisine_type, price_range, halal_status, alcohol_on_premises, updated_at, images_uploaded_at";

async function fetchAllRestaurants(): Promise<Restaurant[]> {
  const supabase = getSupabaseServer();
  if (!supabase) throw new SupabaseUnavailableError();

  const rows: Restaurant[] = [];
  let offset = 0;

  while (true) {
    let data: Record<string, unknown>[] | null = null;
    let error: { message?: string } | null = null;

    const full = await supabase
      .from("restaurants")
      .select(RESTAURANT_SELECT)
      .not("slug", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (full.error && /images_uploaded_at/i.test(full.error.message ?? "")) {
      const fallback = await supabase
        .from("restaurants")
        .select(RESTAURANT_SELECT.replace(", images_uploaded_at", ""))
        .not("slug", "is", null)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      data = fallback.data as Record<string, unknown>[] | null;
      error = fallback.error;
    } else {
      data = full.data as Record<string, unknown>[] | null;
      error = full.error;
    }

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const slug = String(row.slug ?? "").trim();
      if (isSubdomainSafeSlug(slug)) {
        rows.push({ ...row, slug } as Restaurant);
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

function countVirtualPages(restaurant: Restaurant): number {
  let n = 2; // overview + halal-info
  if (parseMenuData(restaurant.menu_data)) n += 1;
  return n;
}

async function main() {
  const jsonOut = process.argv.includes("--json");
  const restaurants = await fetchAllRestaurants();

  const results: { slug: string; issues: ReturnType<typeof auditRestaurantRow> }[] =
    [];

  for (const restaurant of restaurants) {
    const issues = auditRestaurantRow(restaurant);
    results.push({ slug: restaurant.slug, issues });
  }

  const summary = summarizeAudits(results);
  const totalVirtualPages = restaurants.reduce(
    (sum, r) => sum + countVirtualPages(r),
    0
  );

  const payload = {
    restaurants: restaurants.length,
    virtualPages: totalVirtualPages,
    ...summary,
  };

  if (jsonOut) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log("Schema validation summary");
  console.log("-------------------------");
  console.log(`Restaurants scanned: ${restaurants.length}`);
  console.log(`Virtual page graphs: ${totalVirtualPages}`);
  console.log(`Listings with errors: ${summary.pagesWithErrors}`);
  console.log(`Listings with warnings: ${summary.pagesWithWarnings}`);
  console.log(`Missing telephone: ${summary.missingTelephone}`);
  console.log(`Missing geo: ${summary.missingGeo}`);
  console.log(`Missing hours: ${summary.missingHours}`);
  console.log(`Missing image: ${summary.missingImage}`);
  console.log("\nTop issues:");
  for (const row of summary.topIssues) {
    console.log(
      `  ${row.code}: ${row.count} (e.g. ${row.exampleSlugs.join(", ")})`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
