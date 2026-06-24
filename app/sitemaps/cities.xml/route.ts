export const runtime = "edge";

import {
  buildCitySitemapEntries,
  fetchDistinctCitySlugs,
  SITEMAP_CACHE_HEADERS,
} from "@/lib/sitemap-data";
import { restaurantSlugFromRequest } from "@/lib/sitemap-host";
import { sitemapToXml } from "@/lib/sitemap-xml";

export const revalidate = 86400;

export async function GET(request: Request) {
  if (restaurantSlugFromRequest(request)) {
    return new Response("Not found", { status: 404 });
  }

  const cities = await fetchDistinctCitySlugs();
  const xml = sitemapToXml(buildCitySitemapEntries(cities));

  return new Response(xml, { headers: SITEMAP_CACHE_HEADERS });
}
