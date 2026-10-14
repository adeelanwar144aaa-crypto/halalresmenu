export const runtime = "edge";

import {
  buildMainSiteSitemapEntries,
  fetchMaxRestaurantLastModified,
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

/** Main site urlset — only served on the apex domain. */
export async function GET(request: Request) {
  try {
    if (restaurantSlugFromRequest(request)) {
      return new Response("Not found", { status: 404 });
    }

    let siteLastModified: Date | undefined;
    try {
      siteLastModified = await fetchMaxRestaurantLastModified();
    } catch (error) {
      logSitemapError("sitemap-main lastmod", error);
    }
    const xml = sitemapToXml(buildMainSiteSitemapEntries(siteLastModified));
    return sitemapXmlResponse(xml);
  } catch (error) {
    return sitemapFailureResponse("sitemap-main.xml", error);
  }
}
