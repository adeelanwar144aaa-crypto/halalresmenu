import sitemapRestaurants from "@/app/sitemap-restaurants";

export const runtime = "edge";
import { sitemapToXml } from "@/lib/sitemap-xml";

export const revalidate = 86400;

export async function GET() {
  const entries = await sitemapRestaurants();
  const xml = sitemapToXml(entries);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
