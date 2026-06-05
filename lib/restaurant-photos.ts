import type { RestaurantPhoto } from "@/types/restaurant";

const MAX_GALLERY_PHOTOS = 10;

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Normalises the restaurants.photos JSONB column (string[] or JSON string).
 */
export function parseRestaurantPhotosJson(value: unknown): string[] {
  if (value == null) return [];

  let raw: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return isHttpUrl(trimmed) ? [trimmed] : [];
    }
  }

  if (!Array.isArray(raw)) return [];

  const urls: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim() && isHttpUrl(item.trim())) {
      urls.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const candidate =
        typeof obj.url === "string"
          ? obj.url
          : typeof obj.photo_url === "string"
            ? obj.photo_url
            : null;
      if (candidate?.trim() && isHttpUrl(candidate.trim())) {
        urls.push(candidate.trim());
      }
    }
  }
  return urls;
}

/**
 * Gallery URLs: Google JSONB photos first, then restaurant_photos rows (deduped, max 10).
 */
export function resolveRestaurantGalleryUrls(
  jsonbPhotos: unknown,
  tablePhotos: RestaurantPhoto[] = []
): string[] {
  const fromJson = parseRestaurantPhotosJson(jsonbPhotos);
  const fromTable = tablePhotos
    .map((p) => p.url?.trim())
    .filter((url): url is string => Boolean(url && isHttpUrl(url)));

  const seen = new Set<string>();
  const merged: string[] = [];

  for (const url of [...fromJson, ...fromTable]) {
    if (seen.has(url)) continue;
    seen.add(url);
    merged.push(url);
    if (merged.length >= MAX_GALLERY_PHOTOS) break;
  }

  return merged;
}

export function firstRestaurantPhotoUrl(
  jsonbPhotos: unknown,
  tablePhotos: RestaurantPhoto[] = []
): string | null {
  return resolveRestaurantGalleryUrls(jsonbPhotos, tablePhotos)[0] ?? null;
}
