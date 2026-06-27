import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Restaurant } from "@/types/restaurant";
import type { RestaurantPhoto, Review } from "@/types/restaurant";
import { throwIfSupabaseUnavailable } from "@/lib/supabase-errors";
import { SupabaseUnavailableError } from "@/lib/supabase-unavailable";

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

async function fetchRestaurantBySlugImpl(
  slug: string
): Promise<Restaurant | null> {
  const supabase = getSupabaseServer();
  if (!supabase) throw new SupabaseUnavailableError();
  try {
    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "*, menu_data, seo_content, photos, reviews, opening_hours, nearby_mosques"
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      throwIfSupabaseUnavailable(error, "fetchRestaurantBySlug");
      return null;
    }
    if (!data) return null;
    return data as Restaurant;
  } catch (err) {
    if (err instanceof SupabaseUnavailableError) throw err;
    throwIfSupabaseUnavailable(err, "fetchRestaurantBySlug");
    return null;
  }
}

/** Deduped per request — layout, metadata, and page share one round trip. */
export const fetchRestaurantBySlug = cache(fetchRestaurantBySlugImpl);

async function fetchRestaurantCityBySlugImpl(
  slug: string
): Promise<string | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("restaurants")
      .select("city")
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      throwIfSupabaseUnavailable(error, "fetchRestaurantCityBySlug");
      return null;
    }
    if (!data) return null;
    const city = String(data.city ?? "").trim();
    return city || null;
  } catch (err) {
    if (err instanceof SupabaseUnavailableError) throw err;
    throwIfSupabaseUnavailable(err, "fetchRestaurantCityBySlug");
    return null;
  }
}

/** Lightweight city lookup for footer (avoids full restaurant row). */
export const fetchRestaurantCityBySlug = cache(fetchRestaurantCityBySlugImpl);

async function fetchRestaurantPhotosImpl(
  restaurantId: string
): Promise<RestaurantPhoto[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("restaurant_photos")
      .select("url,is_primary,restaurant_id")
      .eq("restaurant_id", restaurantId)
      .order("is_primary", { ascending: false })
      .limit(12);
    return (data ?? []) as RestaurantPhoto[];
  } catch {
    return [];
  }
}

export const fetchRestaurantPhotos = cache(fetchRestaurantPhotosImpl);

async function fetchRestaurantReviewsImpl(
  restaurantId: string
): Promise<Review[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("reviews")
      .select("id,restaurant_id,source,author_name,rating,content,date,is_verified")
      .eq("restaurant_id", restaurantId)
      .order("date", { ascending: false })
      .limit(12);
    return (data ?? []) as Review[];
  } catch {
    return [];
  }
}

export const fetchRestaurantReviews = cache(fetchRestaurantReviewsImpl);

export async function restaurantSlugExists(slug: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    return !error && data != null;
  } catch {
    return false;
  }
}
