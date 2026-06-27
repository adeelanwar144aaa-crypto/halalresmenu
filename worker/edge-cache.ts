import {
  CACHE_TTL,
  cacheControlHeader,
  isSitemapPathname,
} from "../lib/cache-config";
import { maintenance503Response } from "../lib/maintenance-response";
import { SUPABASE_UNAVAILABLE_HEADER } from "../lib/supabase-unavailable";
import { extractRestaurantSubdomain, hostnameOnly } from "../lib/host-routing";

/** Long-lived backup entries used only when origin fails (stale-if-error). */
const STALE_BACKUP_SUFFIX = "#hrm-stale-v1";
const STALE_BACKUP_MAX_AGE = 7 * 24 * 3600;

function requestHostname(request: Request): string {
  return hostnameOnly(
    request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      new URL(request.url).hostname
  );
}

export function edgeCacheTtlSeconds(
  request: Request,
  rootDomain?: string
): number {
  const url = new URL(request.url);
  if (isSitemapPathname(url.pathname) || url.pathname === "/robots.txt") {
    return CACHE_TTL.SITEMAP;
  }

  const hostname = requestHostname(request);
  if (extractRestaurantSubdomain(hostname, rootDomain)) {
    return CACHE_TTL.RESTAURANT;
  }

  if (url.pathname === "/" || url.pathname.startsWith("/city")) {
    return CACHE_TTL.HOME_AND_CITY;
  }

  return CACHE_TTL.HOME_AND_CITY;
}

export function isEdgeCacheableRequest(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;

  const url = new URL(request.url);
  const pathname = url.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/invalid-subdomain")
  ) {
    return false;
  }

  if (isSitemapPathname(pathname) || pathname === "/robots.txt") {
    return true;
  }

  const accept = request.headers.get("Accept") ?? "";
  if (
    accept.includes("text/html") ||
    accept.includes("application/xhtml+xml") ||
    accept.includes("application/xml") ||
    accept.includes("text/xml") ||
    accept.includes("text/plain") ||
    accept.includes("*/*")
  ) {
    return true;
  }

  return false;
}

function shouldStoreResponse(response: Response): boolean {
  if (response.status !== 200) return false;
  if (response.headers.has("Set-Cookie")) return false;
  const cc = response.headers.get("Cache-Control") ?? "";
  if (cc.includes("no-store") || cc.includes("private")) return false;
  return true;
}

/** Origin failure where a previously cached copy should be preferred. */
function shouldTryStaleFallback(response: Response): boolean {
  if (response.headers.get(SUPABASE_UNAVAILABLE_HEADER) === "1") return true;
  if (response.status === 429 || response.status >= 500) return true;
  return false;
}

function staleBackupRequest(request: Request): Request {
  return new Request(request.url + STALE_BACKUP_SUFFIX, { method: "GET" });
}

function withEdgeCacheHeaders(
  response: Response,
  cacheState: "HIT" | "MISS" | "STALE",
  originStatus?: number
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-HRM-Edge-Cache", cacheState);
  if (cacheState === "STALE" && originStatus != null) {
    headers.set("X-HRM-Edge-Cache-Origin-Status", String(originStatus));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function matchStaleBackup(
  cache: Cache,
  request: Request
): Promise<Response | undefined> {
  return (await cache.match(staleBackupRequest(request))) ?? undefined;
}

/**
 * Serve/cache GET responses at the Cloudflare edge (Cache API).
 * Stale-if-error: on 429/5xx (or X-HRM-Supabase-Unavailable), serve last good copy.
 * True cache miss + origin failure → 503 maintenance (not 404).
 */
export async function fetchWithEdgeCache(
  request: Request,
  rootDomain: string | undefined,
  originFetch: () => Promise<Response>,
  ctx: { waitUntil: (promise: Promise<unknown>) => void }
): Promise<Response> {
  if (!isEdgeCacheableRequest(request)) {
    return originFetch();
  }

  const ttl = edgeCacheTtlSeconds(request, rootDomain);
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    return withEdgeCacheHeaders(cached, "HIT");
  }

  let response: Response;
  try {
    response = await originFetch();
  } catch {
    response = new Response("", {
      status: 503,
      headers: { [SUPABASE_UNAVAILABLE_HEADER]: "1" },
    });
  }

  if (shouldTryStaleFallback(response)) {
    const stale = await matchStaleBackup(cache, request);
    if (stale) {
      return withEdgeCacheHeaders(stale, "STALE", response.status);
    }
    return maintenance503Response(ttl);
  }

  if (!shouldStoreResponse(response)) {
    return response;
  }

  const body = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", cacheControlHeader(ttl));
  headers.delete(SUPABASE_UNAVAILABLE_HEADER);

  const fresh = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  const staleHeaders = new Headers(headers);
  staleHeaders.set(
    "Cache-Control",
    `public, max-age=${STALE_BACKUP_MAX_AGE}, s-maxage=${STALE_BACKUP_MAX_AGE}`
  );

  const staleBackup = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: staleHeaders,
  });

  ctx.waitUntil(
    Promise.all([
      cache.put(cacheKey, fresh.clone()),
      cache.put(staleBackupRequest(request), staleBackup),
    ])
  );

  return withEdgeCacheHeaders(fresh, "MISS");
}
