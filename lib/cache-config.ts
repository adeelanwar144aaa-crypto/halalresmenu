/** Shared cache TTLs (seconds) — keep in sync with page `revalidate` exports and Worker edge cache. */
export const CACHE_TTL = {
  /** Homepage, /city/, /city/[slug]/, /city/[slug]/all/ */
  HOME_AND_CITY: 3600,
  /** Restaurant subdomain pages (overview, menu) — edge s-maxage */
  RESTAURANT: 86400,
  /** stale-while-revalidate for restaurant HTML at Cloudflare */
  RESTAURANT_STALE_WHILE_REVALIDATE: 604800,
  /** Sitemap XML route handlers */
  SITEMAP: 3600,
  /** Middleware subdomain slug existence check (in-memory, per isolate) */
  MIDDLEWARE_SLUG_MS: 30 * 60 * 1000,
} as const;

export function cacheControlHeader(
  maxAgeSeconds: number,
  opts?: { staleWhileRevalidate?: number }
): string {
  const base = `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`;
  if (opts?.staleWhileRevalidate != null && opts.staleWhileRevalidate > 0) {
    return `${base}, stale-while-revalidate=${opts.staleWhileRevalidate}`;
  }
  return base;
}

export function restaurantPageCacheControlHeader(): string {
  return cacheControlHeader(CACHE_TTL.RESTAURANT, {
    staleWhileRevalidate: CACHE_TTL.RESTAURANT_STALE_WHILE_REVALIDATE,
  });
}

export function isSitemapPathname(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  return (
    path === "/sitemap_index.xml" ||
    path.startsWith("/sitemap") ||
    path.startsWith("/sitemaps/")
  );
}
