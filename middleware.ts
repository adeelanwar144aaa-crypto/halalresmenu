import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { restaurantSlugExistsViaRest } from "@/lib/supabase-rest-edge";

/** Apex domain for production subdomains (e.g. halalresmenu.com), without leading "www.". */
function rootHostname(): string {
  const raw =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://halalresmenu.com";
  try {
    const u = raw.includes("://") ? raw : `https://${raw}`;
    let host = new URL(u).hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    return host;
  } catch {
    return "halalresmenu.com";
  }
}

function normalizeSlug(value: string | null | undefined): string | null {
  const slug = value?.trim().toLowerCase() ?? "";
  if (!slug || slug === "www") return null;
  return slug;
}

/**
 * Returns restaurant slug when the request should be rewritten to `/[slug]...`.
 *
 * - Local: `slug.localhost` (any port), e.g. Host `the-great-chase.localhost:3002`
 * - Production: `slug.<apex>` where apex comes from NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_ROOT_DOMAIN
 */
export function extractRestaurantSubdomain(host: string): string | null {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname) return null;

  if (hostname === "localhost" || hostname === "127.0.0.1") return null;

  if (hostname.endsWith(".localhost")) {
    const sub = hostname.replace(/\.localhost$/, "");
    if (!sub || sub === "www") return null;
    return sub;
  }

  const base = rootHostname();
  if (!base) return null;

  if (hostname === base || hostname === `www.${base}`) return null;

  const suffix = `.${base}`;
  if (hostname.endsWith(suffix)) {
    const sub = hostname.slice(0, -suffix.length);
    if (!sub || sub === "www") return null;
    if (sub.includes(".")) return null;
    return sub;
  }

  return null;
}

/**
 * Resolves the restaurant slug for the current request.
 * 1. `x-subdomain` header from the Cloudflare Worker (e.g. the-great-chase)
 * 2. Subdomain extracted from `x-forwarded-host` or `host`
 */
export function resolveRestaurantSlug(request: NextRequest): string | null {
  const fromWorker = normalizeSlug(request.headers.get("x-subdomain"));
  if (fromWorker) return fromWorker;

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  return extractRestaurantSubdomain(host);
}

export async function middleware(request: NextRequest) {
  const slug = resolveRestaurantSlug(request);

  // Apex / www / no subdomain → serve the requested page (homepage, search, etc.)
  if (!slug) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/invalid-subdomain")) {
    return NextResponse.next();
  }
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/sitemap")
  ) {
    return NextResponse.next();
  }

  const exists = await restaurantSlugExistsViaRest(slug);
  if (!exists) {
    return NextResponse.rewrite(new URL("/invalid-subdomain", request.url));
  }

  const suffix = pathname === "/" ? "" : pathname;
  const url = request.nextUrl.clone();
  url.pathname = `/${slug}${suffix}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/).*)"],
};
