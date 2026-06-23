export const runtime = "edge";

import {
  buildMainSiteSitemapEntries,
  SITEMAP_CACHE_HEADERS,
} from "@/lib/sitemap-data";
import { restaurantSlugFromRequest } from "@/lib/sitemap-host";
import { sitemapToXml } from "@/lib/sitemap-xml";

export const revalidate = 86400;

/** Main site urlset — only served on the apex domain. */
export async function GET(request: Request) {
  if (restaurantSlugFromRequest(request)) {
    return new Response("Not found", { status: 404 });
  }

  const xml = sitemapToXml(buildMainSiteSitemapEntries());
  return new Response(xml, { headers: SITEMAP_CACHE_HEADERS });
}
