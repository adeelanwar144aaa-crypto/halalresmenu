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

/** Alternate public URL shapes for Supabase storage objects. */
export function restaurantPhotoUrlVariants(
  url: string,
  slug?: string
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (candidate: string | null | undefined) => {
    const trimmed = candidate?.trim();
    if (!trimmed || !isHttpUrl(trimmed) || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  };

  add(url);

  if (url.includes("/restaurant-photos/restaurant-photos/")) {
    add(
      url.replace(
        "/restaurant-photos/restaurant-photos/",
        "/restaurant-photos/"
      )
    );
  } else if (
    url.includes("/storage/v1/object/public/restaurant-photos/") &&
    !url.includes("/restaurant-photos/restaurant-photos/")
  ) {
    add(
      url.replace(
        "/storage/v1/object/public/restaurant-photos/",
        "/storage/v1/object/public/restaurant-photos/restaurant-photos/"
      )
    );
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (base && slug) {
    for (let i = 1; i <= 3; i++) {
      add(
        `${base}/storage/v1/object/public/restaurant-photos/restaurant-photos/${slug}/photo-${i}.jpg`
      );
      add(
        `${base}/storage/v1/object/public/restaurant-photos/${slug}/photo-${i}.jpg`
      );
    }
  }

  return out;
}

export function resolveRestaurantPhotoCandidates(
  jsonbPhotos: unknown,
  options: {
    slug?: string;
    logoUrl?: string | null;
    tablePhotos?: RestaurantPhoto[];
  } = {}
): string[] {
  const gallery = resolveRestaurantGalleryUrls(
    jsonbPhotos,
    options.tablePhotos ?? []
  );
  const seen = new Set<string>();
  const out: string[] = [];

  for (const url of gallery) {
    for (const variant of restaurantPhotoUrlVariants(url, options.slug)) {
      if (seen.has(variant)) continue;
      seen.add(variant);
      out.push(variant);
    }
  }

  if (!gallery.length && options.slug) {
    for (const variant of restaurantPhotoUrlVariants("", options.slug)) {
      if (seen.has(variant)) continue;
      seen.add(variant);
      out.push(variant);
    }
  }

  const logo = options.logoUrl?.trim();
  if (logo && isHttpUrl(logo) && !seen.has(logo)) {
    out.push(logo);
  }

  return out;
}
