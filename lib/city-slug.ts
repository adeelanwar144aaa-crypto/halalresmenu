import { FEATURED_CITIES } from "@/lib/featured-cities";

/** Slug variants that resolve to one canonical city hub URL. */
export const CITY_SLUG_ALIASES: Record<string, string> = {
  "stoke-on-trent": "stoke",
};

/** Normalize a city slug to the canonical hub slug. */
export function resolveCanonicalCitySlug(citySlug: string): string {
  const normalized = citySlug.toLowerCase().trim();
  return CITY_SLUG_ALIASES[normalized] ?? normalized;
}

/** URL-safe slug from a city name, e.g. "City of Westminster" → "city-of-westminster". */
export function slugifyCity(cityName: string): string {
  return cityName
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Supabase ilike pattern for a city slug (matches search?city=X behaviour). */
export function citySlugToPattern(citySlug: string): string {
  const term = citySlug.replace(/-/g, " ").trim();
  return `%${term}%`;
}

/** Human-readable city label for headings and meta tags. */
export function cityDisplayName(citySlug: string): string {
  const normalized = citySlug.toLowerCase().trim();
  const featured = FEATURED_CITIES.find((c) => c.slug === normalized);
  if (featured) return featured.name;

  return citySlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function cityHubPath(citySlug: string): string {
  return `/city/${resolveCanonicalCitySlug(citySlug)}`;
}

export function cityAllPath(citySlug: string): string {
  return `/city/${resolveCanonicalCitySlug(citySlug)}/all`;
}
