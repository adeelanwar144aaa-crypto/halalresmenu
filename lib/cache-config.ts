/** Shared cache TTLs (seconds) — keep in sync with page `revalidate` exports and Worker edge cache. */
export const CACHE_TTL = {
  /** Homepage, /city/, /city/[slug]/, /city/[slug]/all/ */
  HOME_AND_CITY: 3600,
  /** Restaurant subdomain pages (overview, menu, halal-info) */
  RESTAURANT: 1800,
  /** Sitemap XML route handlers */
  SITEMAP: 3600,
  /** Middleware subdomain slug existence check (in-memory, per isolate) */
  MIDDLEWARE_SLUG_MS: 30 * 60 * 1000,
} as const;

export function cacheControlHeader(maxAgeSeconds: number): string {
  return `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`;
}

export function isSitemapPathname(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  return (
    path === "/sitemap_index.xml" ||
    path.startsWith("/sitemap") ||
    path.startsWith("/sitemaps/")
  );
}
