const PLACEHOLDER_BASE = "https://placehold.co";

/**
 * Branded placeholder when no restaurant photo exists (external CDN).
 */
export function restaurantPhotoPlaceholder(
  slug: string,
  index: number
): string {
  const label = encodeURIComponent(`${slug} · ${index + 1}`);
  return `${PLACEHOLDER_BASE}/800x600/1a7a4a/f5faf7/png?text=${label}`;
}
