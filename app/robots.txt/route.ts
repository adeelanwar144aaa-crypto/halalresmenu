export const runtime = "edge";

import { getApexOrigin, ROBOTS_CACHE_HEADERS } from "@/lib/sitemap-data";
import { restaurantSlugFromRequest } from "@/lib/sitemap-host";
import { restaurantSubdomainUrl } from "@/lib/utils";

/** Keep in sync with `CACHE_TTL.SITEMAP` in lib/cache-config.ts */
export const revalidate = 3600;

const ROBOT_AGENTS = [
  "User-agent: *",
  "Allow: /",
  "",
  "User-agent: Googlebot",
  "Allow: /",
  "",
  "User-agent: Bingbot",
  "Allow: /",
  "",
  "User-agent: Slurp",
  "Allow: /",
  "",
  "User-agent: DuckDuckBot",
  "Allow: /",
  "",
  "User-agent: Yandex",
  "Allow: /",
  "",
  "User-agent: GPTBot",
  "Allow: /",
  "",
  "User-agent: Claude-Web",
  "Allow: /",
  "",
  "User-agent: PerplexityBot",
  "Allow: /",
];

export async function GET(request: Request) {
  const slug = restaurantSlugFromRequest(request);
  const origin = slug ? restaurantSubdomainUrl(slug) : getApexOrigin();
  const sitemapUrl = `${origin}/sitemap.xml`;

  const body = [...ROBOT_AGENTS, "", `Sitemap: ${sitemapUrl}`, ""].join("\n");

  return new Response(body, {
    headers: ROBOTS_CACHE_HEADERS,
  });
}
