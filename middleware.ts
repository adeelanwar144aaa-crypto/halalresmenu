import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  extractRestaurantSubdomain,
  hostnameOnly,
  isApexHost,
  normalizeSlug,
} from "@/lib/host-routing";
import { maintenance503Response } from "@/lib/maintenance-response";
import { checkRestaurantSlugViaRest } from "@/lib/supabase-rest-edge";

/**
 * Resolves the restaurant slug for the current request.
 * Only returns a slug on restaurant subdomains — apex/www never run restaurant lookup.
 */
export function resolveRestaurantSlug(request: NextRequest): string | null {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";

  if (isApexHost(host)) {
    return null;
  }

  const fromWorker = normalizeSlug(request.headers.get("x-subdomain"));
  if (fromWorker) return fromWorker;

  return extractRestaurantSubdomain(host);
}

function forwardWithPathname(
  request: NextRequest,
  pathname: string,
  init?: { rewrite?: URL }
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-hrm-pathname", pathname);

  if (init?.rewrite) {
    return NextResponse.rewrite(init.rewrite, {
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/invalid-subdomain")) {
    return forwardWithPathname(request, pathname);
  }

  if (
    pathname === "/sitemap_index.xml" ||
    pathname === "/sitemap_index.xml/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/sitemap.xml";
    return forwardWithPathname(request, "/sitemap.xml", { rewrite: url });
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/sitemaps/") ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/privacy" ||
    pathname.startsWith("/terms-conditions")
  ) {
    return forwardWithPathname(request, pathname);
  }

  const slug = resolveRestaurantSlug(request);

  if (!slug) {
    return forwardWithPathname(request, pathname);
  }

  const slugResult = await checkRestaurantSlugViaRest(slug);
  if (slugResult === "unavailable") {
    return maintenance503Response();
  }
  if (slugResult === "missing") {
    return forwardWithPathname(
      request,
      "/invalid-subdomain",
      { rewrite: new URL("/invalid-subdomain", request.url) }
    );
  }

  const suffix = pathname === "/" ? "" : pathname;
  const url = request.nextUrl.clone();
  url.pathname = `/${slug}${suffix}`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-hrm-restaurant-slug", slug);
  requestHeaders.set("x-hrm-pathname", url.pathname);

  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/).*)"],
};

// Re-export for tests and sitemap-host (prefer importing from lib/host-routing)
export { extractRestaurantSubdomain } from "@/lib/host-routing";
