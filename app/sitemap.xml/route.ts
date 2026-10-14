export const runtime = "edge";

import {
  buildApexSitemapIndexEntries,
  buildRestaurantSitemapEntries,
  fetchRestaurantSitemapRow,
  fetchSitemapIndexData,
  getApexOrigin,
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

    const apex = getApexOrigin();
    let restaurants: Awaited<
      ReturnType<typeof fetchSitemapIndexData>
    >["restaurants"] = [];
    let cityLastModified = new Map<string, Date>();

    try {
      const data = await fetchSitemapIndexData();
      restaurants = data.restaurants;
      cityLastModified = data.cityLastModified;
    } catch (error) {
      logSitemapError("apex index data fetch", error);
    }

    let citySitemapLastModified: Date | undefined;
    for (const d of cityLastModified.values()) {
      if (!citySitemapLastModified || d > citySitemapLastModified) {
        citySitemapLastModified = d;
      }
    }

    const index = buildApexSitemapIndexEntries(restaurants, {
      siteLastModified: latestDateFromRows(restaurants),
      citySitemapLastModified,
    });

    if (index.length === 0) {
      index.push({ loc: `${apex}/sitemap-main.xml` });
      index.push({ loc: `${apex}/sitemaps/cities.xml` });
    }

    const xml = sitemapIndexToXml(index);
    return sitemapXmlResponse(xml);
  } catch (error) {
    return sitemapFailureResponse("sitemap.xml", error);
  }
}
