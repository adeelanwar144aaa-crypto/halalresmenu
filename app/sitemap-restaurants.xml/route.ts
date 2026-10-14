export const runtime = "edge";

import {
  buildRestaurantSubdomainSitemapIndex,
  fetchAllRestaurantSlugs,
} from "@/lib/sitemap-data";
import {
  logSitemapError,
  sitemapFailureResponse,
  sitemapXmlResponse,
} from "@/lib/sitemap-route";
import { restaurantSlugFromRequest } from "@/lib/sitemap-host";
import { sitemapIndexToXml } from "@/lib/sitemap-xml";

/** Keep in sync with `CACHE_TTL.SITEMAP` in lib/cache-config.ts */
export const revalidate = 3600;

/**
 * Legacy URL — returns the same apex sitemap index as /sitemap.xml
 * (main site sitemap + all restaurant subdomain sitemaps).
 */
export async function GET(request: Request) {
  try {
    if (restaurantSlugFromRequest(request)) {
      return new Response("Not found", { status: 404 });
    }

    let restaurants: Awaited<ReturnType<typeof fetchAllRestaurantSlugs>> = [];
    try {
      restaurants = await fetchAllRestaurantSlugs();
    } catch (error) {
      logSitemapError("sitemap-restaurants slug fetch", error);
    }

    const xml = sitemapIndexToXml(
      buildRestaurantSubdomainSitemapIndex(restaurants)
    );

    return sitemapXmlResponse(xml);
  } catch (error) {
    return sitemapFailureResponse("sitemap-restaurants.xml", error);
  }
}
