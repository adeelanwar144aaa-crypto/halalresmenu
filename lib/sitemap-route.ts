import { SITEMAP_CACHE_HEADERS } from "@/lib/sitemap-data";

export function logSitemapError(context: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[sitemap] ${context}:`, msg);
}

export function sitemapXmlResponse(xml: string): Response {
  return new Response(xml, { headers: SITEMAP_CACHE_HEADERS });
}

/** Never throw from route handlers — return 503 XML so the index can stay partial. */
export function sitemapFailureResponse(context: string, error: unknown): Response {
  logSitemapError(context, error);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- ${context} temporarily unavailable -->`;
  return new Response(xml, {
    status: 503,
    headers: SITEMAP_CACHE_HEADERS,
  });
}
