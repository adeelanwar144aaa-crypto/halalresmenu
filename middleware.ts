import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  extractRestaurantSubdomain,
  hostnameOnly,
  isApexHost,
  normalizeSlug,
} from "@/lib/host-routing";
import {
  getDeadSubdomainRedirect,
  getLegacyApexRedirect,
} from "@/lib/legacy-redirects";
import {
  isRestaurantPathname,
  parseRestaurantPath,
} from "@/lib/restaurant-route";
import {
  setSecurityAndSeoHeaders,
  wwwApexRedirectUrl,
} from "@/lib/response-headers";
import { getApexOrigin } from "@/lib/sitemap-data";
import {
  isHalalInfoRequestPath,
  restaurantHalalInfoOverviewUrl,
  restaurantHalalInfoPathAnchor,
} from "@/lib/restaurant-halal-info-redirect";
import { restaurantSubdomainUrl } from "@/lib/utils";

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

function requestHost(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  );
}

/** Production apex only — keep localhost path-based routing for local dev. */
function shouldRedirectApexRestaurantToSubdomain(host: string): boolean {
  const hostname = hostnameOnly(host);
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    return false;
  }
  return isApexHost(host);
}

function redirect301(destination: string): NextResponse {
  return NextResponse.redirect(destination, 301);
}

function finalizeResponse(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  setSecurityAndSeoHeaders(response.headers, hostnameOnly(requestHost(request)));
  return response;
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
  const host = requestHost(request);
  const pathNorm = pathname.replace(/\/$/, "") || "/";

  const wwwTarget = wwwApexRedirectUrl(
    hostnameOnly(host),
    `${pathname}${request.nextUrl.search}`
  );
  if (wwwTarget && isApexHost(host)) {
    return finalizeResponse(request, redirect301(wwwTarget));
  }

  if (pathname.startsWith("/invalid-subdomain")) {
    return finalizeResponse(request, forwardWithPathname(request, pathname));
  }

  if (
    pathname === "/sitemap_index.xml" ||
    pathname === "/sitemap_index.xml/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/sitemap.xml";
    return finalizeResponse(
      request,
      forwardWithPathname(request, "/sitemap.xml", { rewrite: url })
    );
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/ads.txt" ||
    pathname === "/ads.txt/" ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/sitemaps/") ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/privacy" ||
    pathname.startsWith("/terms-conditions")
  ) {
    return finalizeResponse(request, forwardWithPathname(request, pathname));
  }

  const slug = resolveRestaurantSlug(request);

  if (slug && pathNorm === "/halal-info") {
    return finalizeResponse(
      request,
      redirect301(restaurantHalalInfoOverviewUrl(slug))
    );
  }

  if (slug) {
    const dead = getDeadSubdomainRedirect(slug);
    if (dead) {
      return finalizeResponse(request, redirect301(dead));
    }

    if (pathNorm === "/-Home") {
      return finalizeResponse(
        request,
        redirect301(restaurantSubdomainUrl(slug))
      );
    }

    if (pathNorm === "/city-Cities") {
      return finalizeResponse(
        request,
        redirect301(`${getApexOrigin()}/city`)
      );
    }

    const suffix = pathname === "/" ? "" : pathname;
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}${suffix}`;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-hrm-restaurant-slug", slug);
    requestHeaders.set("x-hrm-pathname", url.pathname);

    return finalizeResponse(
      request,
      NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    );
  }

  if (shouldRedirectApexRestaurantToSubdomain(host)) {
    const legacyTarget = getLegacyApexRedirect(pathname);
    if (legacyTarget) {
      const destination = legacyTarget.startsWith("http")
        ? legacyTarget
        : `${getApexOrigin()}${legacyTarget}`;
      return finalizeResponse(request, redirect301(destination));
    }

    if (isRestaurantPathname(pathname)) {
      const parsed = parseRestaurantPath(pathname);
      if (parsed) {
        if (parsed.suffix === "/halal-info") {
          return finalizeResponse(
            request,
            redirect301(restaurantHalalInfoOverviewUrl(parsed.slug))
          );
        }
        const dead = getDeadSubdomainRedirect(parsed.slug);
        if (dead) {
          return finalizeResponse(request, redirect301(dead));
        }
        return finalizeResponse(
          request,
          redirect301(restaurantSubdomainUrl(parsed.slug, parsed.suffix))
        );
      }
    }
  }

  if (isHalalInfoRequestPath(pathname)) {
    const parsed = parseRestaurantPath(pathname);
    if (parsed?.suffix === "/halal-info") {
      return finalizeResponse(
        request,
        redirect301(
          restaurantHalalInfoPathAnchor(request.nextUrl.origin, parsed.slug)
        )
      );
    }
  }

  return finalizeResponse(request, forwardWithPathname(request, pathname));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/|ads\\.txt).*)"],
};

// Re-export for tests and sitemap-host (prefer importing from lib/host-routing)
export { extractRestaurantSubdomain } from "@/lib/host-routing";
