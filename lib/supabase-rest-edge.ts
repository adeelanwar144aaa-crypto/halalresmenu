/**
 * Edge / middleware–safe Supabase lookups using the REST API only.
 */
import { CACHE_TTL } from "@/lib/cache-config";
import { isSupabaseUnavailableStatus } from "@/lib/supabase-unavailable";

function trimEnv(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  let v = value.replace(/^\uFEFF/, "").trim();
  if (v.length === 0) return undefined;
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.length > 0 ? v : undefined;
}

function normalizeSupabaseRestBase(): string | null {
  const raw = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!raw) return null;
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname) return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export type SlugCheckResult = "exists" | "missing" | "unavailable";

type SlugCacheEntry = { exists: boolean; expiresAt: number };

/** Short TTL cache — avoids repeat checks within a warm isolate. */
const slugExistsCache = new Map<string, SlugCacheEntry>();
/** Longer positive-only cache — trust during 429/503 if slug was valid before. */
const slugPositiveStaleCache = new Map<string, number>();
const SLUG_CACHE_MAX = 5000;
const SLUG_POSITIVE_STALE_MS = 7 * 24 * 3600 * 1000;

function getCachedSlugResult(slug: string): SlugCheckResult | null {
  const hit = slugExistsCache.get(slug);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    slugExistsCache.delete(slug);
    return null;
  }
  return hit.exists ? "exists" : "missing";
}

function setCachedSlugResult(slug: string, exists: boolean): void {
  if (slugExistsCache.size >= SLUG_CACHE_MAX) {
    const firstKey = slugExistsCache.keys().next().value;
    if (firstKey) slugExistsCache.delete(firstKey);
  }
  slugExistsCache.set(slug, {
    exists,
    expiresAt: Date.now() + CACHE_TTL.MIDDLEWARE_SLUG_MS,
  });
  if (exists) {
    slugPositiveStaleCache.set(slug, Date.now() + SLUG_POSITIVE_STALE_MS);
  }
}

function hasPositiveStaleSlug(slug: string): boolean {
  const exp = slugPositiveStaleCache.get(slug);
  if (!exp) return false;
  if (Date.now() > exp) {
    slugPositiveStaleCache.delete(slug);
    return false;
  }
  return true;
}

/**
 * Subdomain slug existence check with outage-aware fallbacks.
 * - `exists` / `missing`: confirmed from Supabase (or short-lived cache)
 * - `unavailable`: quota/outage — caller should 503 or serve stale edge cache
 * - On 429/503, if slug was previously confirmed `exists`, returns `exists` (no DB re-verify)
 */
export async function checkRestaurantSlugViaRest(
  slug: string
): Promise<SlugCheckResult> {
  const normalized = slug.trim().toLowerCase();
  const cached = getCachedSlugResult(normalized);
  if (cached) return cached;

  const base = normalizeSupabaseRestBase();
  const key = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!base || !key || key.length < 20) return "unavailable";

  const url = `${base}/rest/v1/restaurants?select=id&slug=eq.${encodeURIComponent(normalized)}&limit=1`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      if (isSupabaseUnavailableStatus(res.status)) {
        if (hasPositiveStaleSlug(normalized)) return "exists";
        return "unavailable";
      }
      return "missing";
    }

    const data = (await res.json()) as unknown;
    const exists = Array.isArray(data) && data.length > 0;
    setCachedSlugResult(normalized, exists);
    return exists ? "exists" : "missing";
  } catch {
    if (hasPositiveStaleSlug(normalized)) return "exists";
    return "unavailable";
  }
}

/** @deprecated Prefer checkRestaurantSlugViaRest for outage handling. */
export async function restaurantSlugExistsViaRest(
  slug: string
): Promise<boolean> {
  const result = await checkRestaurantSlugViaRest(slug);
  return result === "exists";
}
