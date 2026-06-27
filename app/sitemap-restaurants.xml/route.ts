export const runtime = "edge";

import {
  buildApexSitemapIndexEntries,
  fetchAllRestaurantSlugs,
  SITEMAP_CACHE_HEADERS,
} from "@/lib/sitemap-data";
import { restaurantSlugFromRequest } from "@/lib/sitemap-host";
import { sitemapIndexToXml } from "@/lib/sitemap-xml";

/** Keep in sync with `CACHE_TTL.SITEMAP` in lib/cache-config.ts */
export const revalidate = 3600;

/**
 * Legacy URL — returns the same apex sitemap index as /sitemap.xml
 * (main site sitemap + all restaurant subdomain sitemaps).
 */
export async function GET(request: Request) {
  if (restaurantSlugFromRequest(request)) {
    return new Response("Not found", { status: 404 });
  }

  const restaurants = await fetchAllRestaurantSlugs();
  const xml = sitemapIndexToXml(buildApexSitemapIndexEntries(restaurants));

  return new Response(xml, { headers: SITEMAP_CACHE_HEADERS });
}
