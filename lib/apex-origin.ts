import { getSiteUrl } from "@/lib/utils";

/** Production apex origin, e.g. https://halalresmenu.com — safe for middleware (no Supabase). */
export function getApexOrigin(): string {
  const base = getSiteUrl();
  try {
    const u = new URL(base.includes("://") ? base : `https://${base}`);
    return u.origin;
  } catch {
    return "https://halalresmenu.com";
  }
}
