import { hostnameOnly, isApexHost, rootHostname } from "@/lib/host-routing";

/** Cloudflare Pages preview / branch deploy hosts — must not be indexed. */
export function isPagesDevHost(host: string): boolean {
  const hostname = hostnameOnly(host);
  return hostname === "pages.dev" || hostname.endsWith(".pages.dev");
}

/** Production apex + restaurant subdomains on the configured root domain. */
export function isProductionSiteHost(host: string, rootOverride?: string): boolean {
  const hostname = hostnameOnly(host);
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return false;
  }
  if (hostname.endsWith(".localhost")) return false;
  if (isPagesDevHost(host)) return false;

  const base = rootHostname(rootOverride);
  if (hostname === base || hostname === `www.${base}`) return true;
  if (hostname.endsWith(`.${base}`) && !hostname.slice(0, -`.${base}`.length).includes(".")) {
    return true;
  }
  return false;
}

/** Non-production hosts (preview URLs, unknown domains) should carry noindex. */
export function shouldNoindexHost(host: string, rootOverride?: string): boolean {
  return !isProductionSiteHost(host, rootOverride);
}

/** Canonical apex without www (matches sitemap + metadata). */
export function canonicalApexHostname(rootOverride?: string): string {
  return rootHostname(rootOverride);
}

export function isWwwApexHost(host: string, rootOverride?: string): boolean {
  return hostnameOnly(host) === `www.${canonicalApexHostname(rootOverride)}`;
}

export function apexRedirectFromWww(host: string, rootOverride?: string): string | null {
  if (!isWwwApexHost(host, rootOverride)) return null;
  return `https://${canonicalApexHostname(rootOverride)}`;
}

export { isApexHost };
