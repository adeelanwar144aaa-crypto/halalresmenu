import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Restaurant } from "@/types/restaurant";

const PLACEHOLDER_FRAGMENTS = [
  "your-supabase-url",
  "your-supabase-anon-key",
  "changeme",
  "placeholder",
];

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

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_FRAGMENTS.some((p) => lower.includes(p));
}

/**
 * Resolves Supabase URL and anon key from env with trimming and basic validation.
 * Returns null if anything is missing or invalid — callers must not assume a client exists.
 */
export function getResolvedSupabaseConfig(): {
  url: string;
  anonKey: string;
} | null {
  const rawUrl = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const rawKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!rawUrl || !rawKey) return null;
  if (looksLikePlaceholder(rawUrl) || looksLikePlaceholder(rawKey)) return null;

  let url: string;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (!parsed.hostname) return null;
    url = parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }

  if (rawKey.length < 20) return null;

  return { url, anonKey: rawKey };
}

let serverClient: SupabaseClient | null | undefined;

function createSafeClient(): SupabaseClient | null {
  const config = getResolvedSupabaseConfig();
  if (!config) {
    return null;
  }
  try {
    return createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    });
  } catch {
    return null;
  }
}

/**
 * Browser-safe client. Returns null if env is missing or invalid (never throws).
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  return createSafeClient();
}

/**
 * Server / RSC / middleware. Returns null if env is missing or invalid (never throws).
 * Uses a module-level cache so repeated calls do not re-parse env or re-instantiate.
 */
export function getSupabaseServer(): SupabaseClient | null {
  if (serverClient !== undefined) {
    return serverClient;
  }
  serverClient = createSafeClient();
  return serverClient;
}

export async function fetchRestaurantBySlug(
  slug: string
): Promise<Restaurant | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "*, menu_data, seo_content, photos, reviews, opening_hours, nearby_mosques"
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return data as Restaurant;
  } catch {
    return null;
  }
}

export async function restaurantSlugExists(slug: string): Promise<boolean> {
  const row = await fetchRestaurantBySlug(slug);
  return row !== null;
}
