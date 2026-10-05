export const runtime = "edge";

import {
  buildCitySitemapEntries,
  fetchCityLastModifiedMap,
  fetchDistinctCitySlugs,
  SITEMAP_CACHE_HEADERS,
} from "@/lib/sitemap-data";
import { restaurantSlugFromRequest } from "@/lib/sitemap-host";
import { sitemapToXml } from "@/lib/sitemap-xml";

/** Keep in sync with `CACHE_TTL.SITEMAP` in lib/cache-config.ts */
export const revalidate = 3600;

export async function GET(request: Request) {
  if (restaurantSlugFromRequest(request)) {
    return new Response("Not found", { status: 404 });
  }

  const [cities, lastModifiedByCity] = await Promise.all([
    fetchDistinctCitySlugs(),
    fetchCityLastModifiedMap(),
  ]);
  const xml = sitemapToXml(
    buildCitySitemapEntries(cities, lastModifiedByCity)
  );

  return new Response(xml, { headers: SITEMAP_CACHE_HEADERS });
}
