/** Path segments that are app routes, not restaurant slugs. */
const RESERVED_SEGMENTS = new Set([
  "search",
  "invalid-subdomain",
  "api",
  "_next",
  "city",
  "sitemaps",
  "sitemap_index.xml",
  "ads.txt",
  "robots.txt",
  "about",
  "contact",
  "privacy",
  "terms-conditions",
]);

/**
 * True when the URL path is a restaurant listing (`/:slug`, `/:slug/menu`, `/:slug/halal-info`).
 */
export function isRestaurantPathname(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/" || path === "/search" || path.startsWith("/invalid-subdomain")) {
    return false;
  }
  if (
    path.startsWith("/sitemap") ||
    path.startsWith("/city") ||
    path === "/ads.txt" ||
    path === "/robots.txt"
  ) {
    return false;
  }
  if (
    path === "/about" ||
    path === "/contact" ||
    path === "/privacy" ||
    path.startsWith("/terms-conditions")
  ) {
    return false;
  }

  const match = path.match(/^\/([^/]+)(?:\/(menu|halal-info))?$/);
  if (!match) return false;

  return !RESERVED_SEGMENTS.has(match[1]);
}

export type ParsedRestaurantPath = {
  slug: string;
  /** Empty string for overview, or `/menu` / `/halal-info`. */
  suffix: string;
};

/** Parse `/:slug`, `/:slug/menu`, or `/:slug/halal-info` when not a reserved route. */
export function parseRestaurantPath(pathname: string): ParsedRestaurantPath | null {
  const path = pathname.replace(/\/$/, "") || "/";
  const match = path.match(/^\/([^/]+)(?:\/(menu|halal-info))?$/);
  if (!match || RESERVED_SEGMENTS.has(match[1])) return null;

  const suffix = match[2] ? `/${match[2]}` : "";
  return { slug: match[1].toLowerCase(), suffix };
}
