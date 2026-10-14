/**
 * STEP 1 dry-run: classify restaurants as READY vs NOT READY (no DB writes).
 *
 *   npx tsx scripts/audit-restaurant-ready.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { parseMenuData } from "@/lib/menu-data";
import { parseRestaurantPhotosJson } from "@/lib/restaurant-photos";
import { resolveCanonicalCitySlug, slugifyCity } from "@/lib/city-slug";
import type { Restaurant } from "@/types/restaurant";

const R2_PUBLIC = process.env.R2_PUBLIC_URL?.trim() ?? "";

type Row = Pick<
  Restaurant,
  "id" | "slug" | "name" | "city" | "photos" | "menu_data" | "about_content"
>;

function hasR2Photos(row: Pick<Restaurant, "photos">): boolean {
  const photos = parseRestaurantPhotosJson(row.photos);
  const r2Needle = "r2.dev";
  const publicHost = R2_PUBLIC.replace(/^https?:\/\//, "").split("/")[0];
  return photos.some(
    (u) => u.includes(r2Needle) || (publicHost && u.includes(publicHost))
  );
}

function menuItemCount(row: Pick<Restaurant, "menu_data">): number {
  const menu = parseMenuData(row.menu_data);
  if (!menu?.categories) return 0;
  let n = 0;
  for (const c of menu.categories) n += c.items.length;
  return n;
}

function hasRealMenu(row: Pick<Restaurant, "menu_data">): boolean {
  const menu = parseMenuData(row.menu_data);
  return menu?.source === "restaurant_menu" && menuItemCount(row) >= 3;
}

function hasAboutContent(row: Pick<Restaurant, "about_content">): boolean {
  return row.about_content != null;
}

function classify(row: Row): {
  ready: boolean;
  missingPhotos: boolean;
  missingMenu: boolean;
  missingContent: boolean;
  reason: string;
} {
  const missingPhotos = !hasR2Photos(row);
  const missingMenu = !hasRealMenu(row);
  const missingContent = !hasAboutContent(row);
  const ready = !missingPhotos && !missingMenu && !missingContent;
  const parts: string[] = [];
  if (missingPhotos) parts.push("missing R2 photos");
  if (missingMenu) parts.push("missing real menu (restaurant_menu, 3+ items)");
  if (missingContent) parts.push("missing about_content");
  return {
    ready,
    missingPhotos,
    missingMenu,
    missingContent,
    reason: ready ? "READY" : parts.join("; "),
  };
}

function csvEscape(s: string): string {
  const t = s.replace(/"/g, '""');
  return `"${t}"`;
}

async function countRelated(
  supabase: ReturnType<typeof createClient>,
  table: string,
  ids: string[]
): Promise<number | string> {
  if (ids.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("restaurant_id", chunk);
    if (error) return `error: ${error.message}`;
    total += count ?? 0;
  }
  return total;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const rows: Row[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, slug, name, city, photos, menu_data, about_content")
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }

  const classified = rows.map((r) => ({ row: r, ...classify(r) }));
  const ready = classified.filter((c) => c.ready);
  const notReady = classified.filter((c) => !c.ready);

  const onlyPhotos = notReady.filter(
    (c) => c.missingPhotos && !c.missingMenu && !c.missingContent
  ).length;
  const onlyMenu = notReady.filter(
    (c) => !c.missingPhotos && c.missingMenu && !c.missingContent
  ).length;
  const onlyContent = notReady.filter(
    (c) => !c.missingPhotos && !c.missingMenu && c.missingContent
  ).length;
  const photosAndMenu = notReady.filter(
    (c) => c.missingPhotos && c.missingMenu && !c.missingContent
  ).length;
  const photosAndContent = notReady.filter(
    (c) => c.missingPhotos && !c.missingMenu && c.missingContent
  ).length;
  const menuAndContent = notReady.filter(
    (c) => !c.missingPhotos && c.missingMenu && c.missingContent
  ).length;
  const allThree = notReady.filter(
    (c) => c.missingPhotos && c.missingMenu && c.missingContent
  ).length;

  const missingPhotosTotal = notReady.filter((c) => c.missingPhotos).length;
  const missingMenuTotal = notReady.filter((c) => c.missingMenu).length;
  const missingContentTotal = notReady.filter((c) => c.missingContent).length;

  const readyByCity = new Map<string, number>();
  const totalByCity = new Map<string, number>();
  for (const c of classified) {
    const name = c.row.city?.trim() || "(no city)";
    const slug = resolveCanonicalCitySlug(slugifyCity(name)) ?? name.toLowerCase();
    totalByCity.set(slug, (totalByCity.get(slug) ?? 0) + 1);
    if (c.ready) readyByCity.set(slug, (readyByCity.get(slug) ?? 0) + 1);
  }

  const citiesZeroAfter = [...totalByCity.keys()].filter(
    (slug) => (readyByCity.get(slug) ?? 0) === 0
  );

  const topReadyCities = [...readyByCity.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const notReadyIds = notReady.map((c) => c.row.id);

  const relatedTables = [
    "menu_items",
    "menu_categories",
    "restaurant_photos",
    "reviews",
    "generated_content",
    "nearby_mosques",
  ];
  const relatedCounts: Record<string, number | string> = {};
  for (const table of relatedTables) {
    relatedCounts[table] = await countRelated(supabase, table, notReadyIds);
  }

  const logDir = join(process.cwd(), "scripts", "logs");
  mkdirSync(logDir, { recursive: true });
  const csvPath = join(logDir, "to-delete.csv");
  const csvLines = [
    "id,slug,name,city,reason",
    ...notReady.map((c) =>
      [
        csvEscape(String(c.row.id)),
        csvEscape(c.row.slug ?? ""),
        csvEscape(c.row.name ?? ""),
        csvEscape(c.row.city ?? ""),
        csvEscape(c.reason),
      ].join(",")
    ),
  ];
  writeFileSync(csvPath, csvLines.join("\n") + "\n", "utf8");

  console.log("=== RESTAURANT READINESS (DRY RUN — no changes) ===\n");
  console.log({
    total: rows.length,
    READY: ready.length,
    NOT_READY: notReady.length,
  });
  console.log("\nNOT READY breakdown (counts; rows can overlap):");
  console.log({
    missing_R2_photos: missingPhotosTotal,
    missing_real_menu: missingMenuTotal,
    missing_about_content: missingContentTotal,
  });
  console.log("\nNOT READY exclusive combinations:");
  console.log({
    only_missing_photos: onlyPhotos,
    only_missing_menu: onlyMenu,
    only_missing_about_content: onlyContent,
    photos_and_menu: photosAndMenu,
    photos_and_content: photosAndContent,
    menu_and_content: menuAndContent,
    all_three: allThree,
  });
  console.log("\nREADY count per city (top 20):");
  for (const [city, n] of topReadyCities) console.log(`  ${city}: ${n}`);
  console.log(`\nCities that would have 0 READY restaurants: ${citiesZeroAfter.length}`);
  if (citiesZeroAfter.length <= 40) {
    console.log(citiesZeroAfter.sort().join(", "));
  } else {
    console.log(citiesZeroAfter.sort().slice(0, 40).join(", ") + " …");
  }
  console.log("\nRelated rows tied to NOT READY restaurant_id (would need cleanup on delete):");
  console.log(relatedCounts);
  console.log(`\nWrote ${notReady.length} rows → ${csvPath}`);
  console.log("\nReply \"delete\" to run backup + delete (steps 2–6).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
