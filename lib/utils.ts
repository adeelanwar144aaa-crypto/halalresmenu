import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function restaurantCanonicalUrl(slug: string, path = ""): string {
  return restaurantSubdomainUrl(slug, path);
}

/**
 * Public URL on restaurant subdomain for production apex domains.
 * For `NEXT_PUBLIC_SITE_URL` with hostname `localhost`, uses `http(s)://{slug}.localhost:{port}`
 * so local wildcard subdomain testing matches middleware rewrites.
 */
export function restaurantSubdomainUrl(slug: string, path = ""): string {
  const base = getSiteUrl();
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  try {
    const u = new URL(base.includes("://") ? base : `https://${base}`);
    const host = u.hostname.toLowerCase();
    const protocol = u.protocol || "https:";
    const port = u.port ? `:${u.port}` : "";

    if (host === "127.0.0.1") {
      return `${u.origin}/${slug}${suffix}`;
    }
    if (host === "localhost") {
      return `${protocol}//${slug}.localhost${port}${suffix}`;
    }
    if (host.endsWith(".localhost")) {
      const apex = host.replace(/^[^.]+\./, "");
      return `${protocol}//${slug}.${apex}${port}${suffix}`;
    }

    const apex = host.startsWith("www.") ? host.slice(4) : host;
    return `${protocol}//${slug}.${apex}${port}${suffix}`;
  } catch {
    return `${base}/${slug}${suffix}`;
  }
}
