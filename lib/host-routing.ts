/** Apex domain for production subdomains (e.g. halalresmenu.com), without leading "www.". */
export function rootHostname(override?: string): string {
  const raw =
    override?.trim() ||
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

export function hostnameOnly(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

export function normalizeSlug(value: string | null | undefined): string | null {
  const slug = value?.trim().toLowerCase() ?? "";
  if (!slug || slug === "www") return null;
  return slug;
}

/** True when the hostname is the apex site (no restaurant subdomain). */
export function isApexHost(host: string, rootOverride?: string): boolean {
  const hostname = hostnameOnly(host);
  const base = rootHostname(rootOverride);
  return hostname === base || hostname === `www.${base}`;
}

/**
 * Returns restaurant slug when the request should be rewritten to `/[slug]...`.
 *
 * - Local: `slug.localhost` (any port)
 * - Production: `slug.<apex>` where apex comes from env or override
 */
export function extractRestaurantSubdomain(
  host: string,
  rootOverride?: string
): string | null {
  const hostname = hostnameOnly(host);
  if (!hostname) return null;

  if (hostname === "localhost" || hostname === "127.0.0.1") return null;

  if (hostname.endsWith(".localhost")) {
    const sub = hostname.replace(/\.localhost$/, "");
    if (!sub || sub === "www") return null;
    return sub;
  }

  const base = rootHostname(rootOverride);
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
