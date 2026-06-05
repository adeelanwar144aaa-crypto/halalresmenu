/**
 * Edge / middleware–safe Supabase lookups using the REST API only.
 * Do not import `@supabase/supabase-js` here — it avoids broken vendor chunks in middleware.
 */

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

/**
 * Returns true if a row exists for this slug (anon key, RLS permitting SELECT).
 */
export async function restaurantSlugExistsViaRest(
  slug: string
): Promise<boolean> {
  const base = normalizeSupabaseRestBase();
  const key = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!base || !key || key.length < 20) return false;

  const url = `${base}/rest/v1/restaurants?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`;

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
    if (!res.ok) return false;
    const data = (await res.json()) as unknown;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
