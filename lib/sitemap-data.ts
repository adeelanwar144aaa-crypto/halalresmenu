import type { MetadataRoute } from "next";
import { isSubdomainSafeSlug } from "@/lib/subdomain-slug";
import { getSupabaseServer } from "@/lib/supabase";
import { getSiteUrl, restaurantSubdomainUrl } from "@/lib/utils";

const PAGE_SIZE = 1000;

export type RestaurantSitemapRow = {
  slug: string;
  updated_at?: string | null;
};

export type SitemapIndexEntry = {
  loc: string;
  lastModified?: Date;
};

/** Production apex origin, e.g. https://halalresmenu.com */
export function getApexOrigin(): string {
  const base = getSiteUrl();
  try {
    const u = new URL(base.includes("://") ? base : `https://${base}`);
    return u.origin;
  } catch {
    return "https://halalresmenu.com";
  }
}

export async function fetchAllRestaurantSlugs(): Promise<RestaurantSitemapRow[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return [];

  const rows: RestaurantSitemapRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("slug, updated_at")
      .not("slug", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`restaurants fetch: ${error.message}`);
    }

    if (!data?.length) break;

    for (const row of data) {
      const slug = String(row.slug ?? "").trim();
      if (isSubdomainSafeSlug(slug)) {
        rows.push({ slug, updated_at: row.updated_at });
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function fetchRestaurantSitemapRow(
  slug: string
): Promise<RestaurantSitemapRow | null> {
  const normalized = slug.trim().toLowerCase();
  if (!isSubdomainSafeSlug(normalized)) return null;

  const supabase = getSupabaseServer();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("restaurants")
    .select("slug, updated_at")
    .eq("slug", normalized)
    .maybeSingle();

  if (error || !data) return null;

  const rowSlug = String(data.slug ?? "").trim();
  if (!isSubdomainSafeSlug(rowSlug)) return null;

  return { slug: rowSlug, updated_at: data.updated_at };
}

/** Main site pages on the apex domain. */
export function buildMainSiteSitemapEntries(): MetadataRoute.Sitemap {
  const apex = getApexOrigin();
  const now = new Date();

  return [
    {
      url: apex,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${apex}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];
}

/** Pages for a single restaurant subdomain (overview, menu, halal-info). */
export function buildRestaurantSitemapEntries(
  restaurant: RestaurantSitemapRow
): MetadataRoute.Sitemap {
  const lastModified = restaurant.updated_at
    ? new Date(restaurant.updated_at)
    : new Date();

  return [
    {
      url: restaurantSubdomainUrl(restaurant.slug),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: restaurantSubdomainUrl(restaurant.slug, "/menu"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: restaurantSubdomainUrl(restaurant.slug, "/halal-info"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}

/** Apex sitemap index: main site sitemap + one sitemap per restaurant subdomain. */
export function buildApexSitemapIndexEntries(
  restaurants: RestaurantSitemapRow[]
): SitemapIndexEntry[] {
  const apex = getApexOrigin();
  const now = new Date();

  const entries: SitemapIndexEntry[] = [
    {
      loc: `${apex}/sitemap-main.xml`,
      lastModified: now,
    },
  ];

  for (const restaurant of restaurants) {
    entries.push({
      loc: `${restaurantSubdomainUrl(restaurant.slug)}/sitemap.xml`,
      lastModified: restaurant.updated_at
        ? new Date(restaurant.updated_at)
        : now,
    });
  }

  return entries;
}

export const SITEMAP_CACHE_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control":
    "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600",
} as const;

export const ROBOTS_CACHE_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control":
    "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600",
} as const;
