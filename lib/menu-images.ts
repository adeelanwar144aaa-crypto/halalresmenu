import { parseJsonField } from "@/lib/parse-json-field";
import type { Restaurant } from "@/types/restaurant";

function urlsFromRaw(raw: unknown): string[] {
  if (raw == null) return [];
  let value: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter((url) => /^https?:\/\//i.test(url));
}

export function parseMenuImages(raw: unknown): string[] {
  return urlsFromRaw(raw);
}

/** Prefer menu_images column; fall back to menu_data.image_urls. */
export function parseMenuImagesForRestaurant(row: Pick<Restaurant, "menu_images" | "menu_data">): string[] {
  const fromColumn = urlsFromRaw(row.menu_images);
  if (fromColumn.length > 0) return fromColumn;

  const menuObj = parseJsonField<Record<string, unknown>>(row.menu_data);
  return urlsFromRaw(menuObj?.image_urls);
}
