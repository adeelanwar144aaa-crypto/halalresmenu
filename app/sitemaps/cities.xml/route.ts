export const runtime = "edge";

import {
  buildCitySitemapEntries,
  fetchCityLastModifiedMap,
  fetchDistinctCitySlugs,
} from "@/lib/sitemap-data";
import {
  sitemapFailureResponse,
  sitemapXmlResponse,
} from "@/lib/sitemap-route";
import { restaurantSlugFromRequest } from "@/lib/sitemap-host";
import { sitemapToXml } from "@/lib/sitemap-xml";

/** Keep in sync with `CACHE_TTL.SITEMAP` in lib/cache-config.ts */
export const revalidate = 3600;

export async function GET(request: Request) {
  try {
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

    return sitemapXmlResponse(xml);
  } catch (error) {
    return sitemapFailureResponse("sitemaps/cities.xml", error);
  }
}
