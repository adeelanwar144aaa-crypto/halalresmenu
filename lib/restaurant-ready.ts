import { parseMenuData } from "@/lib/menu-data";
import { parseRestaurantPhotosJson } from "@/lib/restaurant-photos";
import type { Restaurant } from "@/types/restaurant";

const R2_PUBLIC = process.env.R2_PUBLIC_URL?.trim() ?? "";

export type ReadyFlags = {
  ready: boolean;
  missingPhotos: boolean;
  missingMenu: boolean;
  missingContent: boolean;
  missingLabel: string;
};

export function hasR2Photos(row: Pick<Restaurant, "photos">): boolean {
  const photos = parseRestaurantPhotosJson(row.photos);
  const r2Needle = "r2.dev";
  const publicHost = R2_PUBLIC.replace(/^https?:\/\//, "").split("/")[0];
  return photos.some(
    (u) => u.includes(r2Needle) || (publicHost && u.includes(publicHost))
  );
}

export function menuItemCount(row: Pick<Restaurant, "menu_data">): number {
  const menu = parseMenuData(row.menu_data);
  if (!menu?.categories) return 0;
  let n = 0;
  for (const c of menu.categories) n += c.items.length;
  return n;
}

export function hasRealMenu(row: Pick<Restaurant, "menu_data">): boolean {
  const menu = parseMenuData(row.menu_data);
  return menu?.source === "restaurant_menu" && menuItemCount(row) >= 3;
}

export function hasAboutContent(row: Pick<Restaurant, "about_content">): boolean {
  return row.about_content != null;
}

export function classifyRestaurantReady(
  row: Pick<Restaurant, "photos" | "menu_data" | "about_content">
): ReadyFlags {
  const missingPhotos = !hasR2Photos(row);
  const missingMenu = !hasRealMenu(row);
  const missingContent = !hasAboutContent(row);
  const ready = !missingPhotos && !missingMenu && !missingContent;
  const parts: string[] = [];
  if (missingPhotos) parts.push("missing R2 photos");
  if (missingMenu) parts.push("missing real menu");
  if (missingContent) parts.push("missing about_content");
  return {
    ready,
    missingPhotos,
    missingMenu,
    missingContent,
    missingLabel: ready ? "READY" : parts.join("; "),
  };
}
