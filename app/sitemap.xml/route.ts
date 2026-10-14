export const runtime = "edge";

import {
  buildApexRootSitemapIndex,
  buildRestaurantSitemapEntries,
  fetchMaxRestaurantLastModified,
  fetchRestaurantSitemapRow,
} from "@/lib/sitemap-data";
import {
  logSitemapError,
  sitemapFailureResponse,
  sitemapXmlResponse,
} from "@/lib/sitemap-route";
import { restaurantSlugFromRequest } from "@/lib/sitemap-host";
import { sitemapIndexToXml, sitemapToXml } from "@/lib/sitemap-xml";

/** Keep in sync with `CACHE_TTL.SITEMAP` in lib/cache-config.ts */
export const revalidate = 3600;

export async function GET(request: Request) {
  try {
    const slug = restaurantSlugFromRequest(request);

    if (slug) {
      const restaurant = await fetchRestaurantSitemapRow(slug);
      if (!restaurant) {
        return new Response("Not found", { status: 404 });
      }

      const xml = sitemapToXml(buildRestaurantSitemapEntries(restaurant));
      return sitemapXmlResponse(xml);
    }

    let siteLastModified: Date | undefined;
    try {
      siteLastModified = await fetchMaxRestaurantLastModified();
    } catch (error) {
      logSitemapError("apex index lastmod", error);
    }

    const index = buildApexRootSitemapIndex({
      siteLastModified,
      citySitemapLastModified: siteLastModified,
      restaurantsSitemapLastModified: siteLastModified,
    });

    const xml = sitemapIndexToXml(index);
    return sitemapXmlResponse(xml);
  } catch (error) {
    return sitemapFailureResponse("sitemap.xml", error);
  }
}
