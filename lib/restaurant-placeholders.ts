import { generateRestaurantTheme } from "@/lib/restaurant-theme";

const PLACEHOLDER_BASE = "https://placehold.co";

/**
 * Branded placeholder when no restaurant photo exists (external CDN).
 * Uses the same deterministic theme as the restaurant subdomain.
 */
export function restaurantPhotoPlaceholder(
  slug: string,
  index: number
): string {
  const theme = generateRestaurantTheme({ slug, name: slug });
  const primary = theme.primary_color.replace(/^#/, "");
  const bg = theme.background_color.replace(/^#/, "");
  const label = encodeURIComponent(`${slug} · ${index + 1}`);
  return `${PLACEHOLDER_BASE}/800x600/${primary}/${bg}/png?text=${label}`;
}
