import { extractRestaurantSubdomain } from "@/middleware";

/** Host header from a Request (supports Cloudflare / reverse proxies). */
export function requestHost(request: Request): string {
  return (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  );
}

/** Restaurant slug when the request is on a restaurant subdomain, else null. */
export function restaurantSlugFromRequest(request: Request): string | null {
  return extractRestaurantSubdomain(requestHost(request));
}
