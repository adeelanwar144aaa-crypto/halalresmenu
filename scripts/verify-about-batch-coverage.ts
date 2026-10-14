/**
 * Verify batch-scope restaurants all have published about guides in Supabase.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { parseMenuData } from "@/lib/menu-data";
import { parseRestaurantPhotosJson } from "@/lib/restaurant-photos";
import { listAboutDraftFiles } from "@/lib/about-draft";
import type { Restaurant } from "@/types/restaurant";

const R2_PUBLIC = process.env.R2_PUBLIC_URL?.trim() ?? "";

function hasR2Photos(row: Pick<Restaurant, "photos">): boolean {
  const photos = parseRestaurantPhotosJson(row.photos);
  const r2Needle = "r2.dev";
  const publicHost = R2_PUBLIC.replace(/^https?:\/\//, "").split("/")[0];
  return photos.some(
    (u) => u.includes(r2Needle) || (publicHost && u.includes(publicHost))
  );
}

function hasRestaurantMenu(row: Pick<Restaurant, "menu_data">): boolean {
  const menu = parseMenuData(row.menu_data);
  return (
    menu?.source === "restaurant_menu" &&
    (menu.categories?.some((c) => c.items.length > 0) ?? false)
  );
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const rows: Restaurant[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "slug, photos, menu_data, about_content, content_generated_at, seo_title, seo_meta_description"
      )
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data ?? []) as Restaurant[];
    rows.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }

  const inScope = rows.filter((r) => hasR2Photos(r) && hasRestaurantMenu(r));
  const withAbout = inScope.filter((r) => {
    const ac = r.about_content as { intro?: string } | null;
    return Boolean(ac?.intro?.trim());
  });
  const withGeneratedAt = inScope.filter((r) => r.content_generated_at?.trim());

  const missingAbout = inScope.filter((r) => {
    const ac = r.about_content as { intro?: string } | null;
    return !ac?.intro?.trim();
  });
  const missingGeneratedAt = inScope.filter((r) => !r.content_generated_at?.trim());

  console.log({
    batchScope: inScope.length,
    withAboutContent: withAbout.length,
    withContentGeneratedAt: withGeneratedAt.length,
  });

  if (missingAbout.length) {
    console.log("\nMissing about_content intro:");
    console.log(missingAbout.map((r) => r.slug).join("\n"));
  }
  if (missingGeneratedAt.length) {
    console.log("\nMissing content_generated_at:");
    console.log(missingGeneratedAt.map((r) => r.slug).join("\n"));
  }

  const drafts = listAboutDraftFiles();
  const unpublishedPass: { slug: string; reason: string }[] = [];
  const publishedSlugs = new Set(
    rows
      .filter((r) => {
        const ac = r.about_content as { intro?: string } | null;
        return r.content_generated_at?.trim() && ac?.intro?.trim();
      })
      .map((r) => r.slug)
  );

  for (const d of drafts) {
    if (d.quality?.status !== "PASS" && !d.quality?.pass) {
      if (inScope.some((r) => r.slug === d.slug)) {
        unpublishedPass.push({
          slug: d.slug,
          reason: `draft ${d.quality?.status ?? "FAIL"}: ${d.quality?.reasons?.join("; ") ?? d.error ?? "unknown"}`,
        });
      }
      continue;
    }
    if (!publishedSlugs.has(d.slug) && inScope.some((r) => r.slug === d.slug)) {
      unpublishedPass.push({ slug: d.slug, reason: "PASS draft not in Supabase" });
    }
  }

  if (unpublishedPass.length) {
    console.log("\nIn-scope drafts not live:");
    for (const u of unpublishedPass) console.log(`- ${u.slug}: ${u.reason}`);
  } else {
    console.log("\nAll in-scope PASS drafts are live in Supabase.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
