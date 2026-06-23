export const runtime = "edge";

import {
  buildApexSitemapIndexEntries,
  buildRestaurantSitemapEntries,
  fetchAllRestaurantSlugs,
  fetchRestaurantSitemapRow,
  SITEMAP_CACHE_HEADERS,
} from "@/lib/sitemap-data";
import { restaurantSlugFromRequest } from "@/lib/sitemap-host";
import { sitemapIndexToXml, sitemapToXml } from "@/lib/sitemap-xml";

export const revalidate = 86400;

export async function GET(request: Request) {
  const slug = restaurantSlugFromRequest(request);

  if (slug) {
    const restaurant = await fetchRestaurantSitemapRow(slug);
    if (!restaurant) {
      return new Response("Not found", { status: 404 });
    }

    const xml = sitemapToXml(buildRestaurantSitemapEntries(restaurant));
    return new Response(xml, { headers: SITEMAP_CACHE_HEADERS });
  }

  const restaurants = await fetchAllRestaurantSlugs();
  const index = buildApexSitemapIndexEntries(restaurants);
  const xml = sitemapIndexToXml(index);

  return new Response(xml, { headers: SITEMAP_CACHE_HEADERS });
}
