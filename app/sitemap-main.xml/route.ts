export const runtime = "edge";

import {
  buildMainSiteSitemapEntries,
  fetchAllRestaurantSlugs,
  latestDateFromRows,
  SITEMAP_CACHE_HEADERS,
} from "@/lib/sitemap-data";
import { restaurantSlugFromRequest } from "@/lib/sitemap-host";
import { sitemapToXml } from "@/lib/sitemap-xml";

/** Keep in sync with `CACHE_TTL.SITEMAP` in lib/cache-config.ts */
export const revalidate = 3600;

/** Main site urlset — only served on the apex domain. */
export async function GET(request: Request) {
  if (restaurantSlugFromRequest(request)) {
    return new Response("Not found", { status: 404 });
  }

  const restaurants = await fetchAllRestaurantSlugs();
  const siteLastModified = latestDateFromRows(restaurants);
  const xml = sitemapToXml(
    buildMainSiteSitemapEntries(siteLastModified)
  );
  return new Response(xml, { headers: SITEMAP_CACHE_HEADERS });
}
