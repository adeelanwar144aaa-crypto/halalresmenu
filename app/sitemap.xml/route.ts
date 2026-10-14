export const runtime = "nodejs";

import {
  buildApexRootSitemapIndex,
  buildRestaurantSitemapEntries,
  fetchRestaurantSitemapRow,
  fetchSitemapIndexData,
  latestDateFromRows,
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

    let citySitemapLastModified: Date | undefined;
    let restaurantsSitemapLastModified: Date | undefined;

    let siteLastModified: Date | undefined;
    try {
      const data = await fetchSitemapIndexData();
      for (const d of data.cityLastModified.values()) {
        if (!citySitemapLastModified || d > citySitemapLastModified) {
          citySitemapLastModified = d;
        }
      }
      restaurantsSitemapLastModified = latestDateFromRows(data.restaurants);
      siteLastModified = restaurantsSitemapLastModified;
    } catch (error) {
      logSitemapError("apex index data fetch", error);
    }

    const index = buildApexRootSitemapIndex({
      siteLastModified,
      citySitemapLastModified,
      restaurantsSitemapLastModified,
    });

    const xml = sitemapIndexToXml(index);
    return sitemapXmlResponse(xml);
  } catch (error) {
    return sitemapFailureResponse("sitemap.xml", error);
  }
}
