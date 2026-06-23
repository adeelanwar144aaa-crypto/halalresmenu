export const runtime = "edge";

import { getApexOrigin } from "@/lib/sitemap-data";
import { restaurantSlugFromRequest } from "@/lib/sitemap-host";
import { restaurantSubdomainUrl } from "@/lib/utils";

export const revalidate = 86400;

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
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
