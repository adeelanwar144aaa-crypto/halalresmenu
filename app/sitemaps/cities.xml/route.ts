export const runtime = "edge";

import {
  buildCitySitemapEntries,
  fetchDistinctCitySlugs,
} from "@/lib/sitemap-data";
import { logSitemapError } from "@/lib/sitemap-route";
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

    let cities: Awaited<ReturnType<typeof fetchDistinctCitySlugs>> = [];
    try {
      cities = await fetchDistinctCitySlugs();
    } catch (error) {
      logSitemapError("cities sitemap city list", error);
    }
    const xml = sitemapToXml(buildCitySitemapEntries(cities, new Map()));

    return sitemapXmlResponse(xml);
  } catch (error) {
    return sitemapFailureResponse("sitemaps/cities.xml", error);
  }
}
