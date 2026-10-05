import {
  apexRedirectFromWww,
  shouldNoindexHost,
  isProductionSiteHost,
} from "@/lib/production-host";
import { hostnameOnly } from "@/lib/host-routing";

export function requestHostnameFromHeaders(
  hostHeader: string | null,
  urlHostname: string
): string {
  return hostnameOnly(hostHeader ?? urlHostname);
}

/** Security + SEO headers for HTML/API responses at the edge. */
export function setSecurityAndSeoHeaders(
  headers: Headers,
  hostname: string,
  rootDomain?: string
): void {
  if (shouldNoindexHost(hostname, rootDomain)) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "SAMEORIGIN");

  if (isProductionSiteHost(hostname, rootDomain)) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
}

export function applySecurityAndSeoHeaders(
  response: Response,
  hostname: string,
  rootDomain?: string
): Response {
  const headers = new Headers(response.headers);
  setSecurityAndSeoHeaders(headers, hostname, rootDomain);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function wwwApexRedirectUrl(
  hostname: string,
  pathname: string,
  rootDomain?: string
): string | null {
  const apex = apexRedirectFromWww(hostname, rootDomain);
  if (!apex) return null;
  return `${apex}${pathname}`;
}
