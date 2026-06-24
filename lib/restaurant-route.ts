/** Path segments that are app routes, not restaurant slugs. */
const RESERVED_SEGMENTS = new Set([
  "search",
  "invalid-subdomain",
  "api",
  "_next",
  "city",
  "sitemaps",
  "sitemap_index.xml",
]);

/**
 * True when the URL path is a restaurant listing (`/:slug`, `/:slug/menu`, `/:slug/halal-info`).
 */
export function isRestaurantPathname(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/" || path === "/search" || path.startsWith("/invalid-subdomain")) {
    return false;
  }
  if (path.startsWith("/sitemap") || path.startsWith("/city")) return false;

  const match = path.match(/^\/([^/]+)(?:\/(menu|halal-info))?$/);
  if (!match) return false;

  return !RESERVED_SEGMENTS.has(match[1]);
}
