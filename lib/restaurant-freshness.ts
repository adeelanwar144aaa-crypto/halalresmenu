import { parseMenuData } from "@/lib/menu-data";
import { parseRestaurantPhotosJson } from "@/lib/restaurant-photos";
type FreshnessRow = {
  photos?: unknown;
  menu_data?: unknown;
  updated_at?: string | null;
  images_uploaded_at?: string | null;
};

/** True when photos/menu were refreshed by the R2 upload pipeline (or images_uploaded_at is set). */
export function restaurantHadContentRefresh(row: FreshnessRow): boolean {
  if (row.images_uploaded_at?.trim()) return true;

  const photos = parseRestaurantPhotosJson(row.photos);
  if (photos.some((url) => url.includes("r2.dev"))) return true;

  const menu = parseMenuData(row.menu_data);
  if (menu?.source === "restaurant_menu") return true;

  return false;
}

/** Last content refresh date for JSON-LD / visible “Last updated” — only when actually refreshed. */
export function restaurantContentUpdatedAt(row: FreshnessRow): Date | null {
  if (!restaurantHadContentRefresh(row)) return null;

  const uploaded = row.images_uploaded_at?.trim();
  if (uploaded) {
    const d = new Date(uploaded);
    if (!Number.isNaN(d.getTime())) return d;
  }

  if (row.updated_at?.trim()) {
    const d = new Date(row.updated_at);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

export function formatContentUpdatedLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
