import deletedRedirects from "../../../public/deleted-redirects.json";
import { cacheControlHeader, CACHE_TTL } from "@/lib/cache-config";

export const runtime = "edge";

/** GSC cleanup 301 map — served from API so it is always in the worker bundle. */
export async function GET() {
  return new Response(JSON.stringify(deletedRedirects), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControlHeader(CACHE_TTL.SITEMAP),
    },
  });
}
