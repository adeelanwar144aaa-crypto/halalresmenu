import type { MetadataRoute } from "next";
import { cacheControlHeader, CACHE_TTL } from "@/lib/cache-config";
import { cityHubPath, resolveCanonicalCitySlug, slugifyCity } from "@/lib/city-slug";
import { restaurantContentUpdatedAt } from "@/lib/restaurant-freshness";
import { throwIfSupabaseUnavailable } from "@/lib/supabase-errors";
import { SupabaseUnavailableError } from "@/lib/supabase-unavailable";
import { isSubdomainSafeSlug } from "@/lib/subdomain-slug";
import { getSupabaseServer } from "@/lib/supabase";
import { getSiteUrl, restaurantSubdomainUrl } from "@/lib/utils";

const PAGE_SIZE = 1000;

const RESTAURANT_SITEMAP_SELECT =
  "slug, updated_at, photos, menu_data, images_uploaded_at";

export type RestaurantSitemapRow = {
  slug: string;
  updated_at?: string | null;
  photos?: unknown;
  menu_data?: unknown;
  images_uploaded_at?: string | null;
};

export function sitemapLastModifiedForRestaurant(
  row: RestaurantSitemapRow
): Date | undefined {
  const content = restaurantContentUpdatedAt(row);
  if (content) return content;
  if (row.updated_at?.trim()) {
    const d = new Date(row.updated_at);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

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
  if (!supabase) throw new SupabaseUnavailableError();

  const rows: RestaurantSitemapRow[] = [];
  let offset = 0;

  while (true) {
    let data: Record<string, unknown>[] | null = null;
    let error = null as { message?: string } | null;

    const full = await supabase
      .from("restaurants")
      .select(RESTAURANT_SITEMAP_SELECT)
      .not("slug", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (
      full.error &&
      /images_uploaded_at/i.test(full.error.message ?? "")
    ) {
      const fallback = await supabase
        .from("restaurants")
        .select("slug, updated_at, photos, menu_data")
        .not("slug", "is", null)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      data = fallback.data as Record<string, unknown>[] | null;
      error = fallback.error;
    } else {
      data = full.data as Record<string, unknown>[] | null;
      error = full.error;
    }

    if (error) {
      throwIfSupabaseUnavailable(error, "restaurants fetch");
      throw error;
    }

    if (!data?.length) break;

    for (const row of data) {
      const slug = String(row.slug ?? "").trim();
      if (isSubdomainSafeSlug(slug)) {
        rows.push({
          slug,
          updated_at: row.updated_at as string | null | undefined,
          photos: row.photos,
          menu_data: row.menu_data,
          images_uploaded_at: row.images_uploaded_at as string | null | undefined,
        });
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
  if (!supabase) throw new SupabaseUnavailableError();

  const { data, error } = await supabase
    .from("restaurants")
    .select("slug, updated_at")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) {
    throwIfSupabaseUnavailable(error, "restaurant sitemap row");
    return null;
  }
  if (!data) return null;

  const rowSlug = String(data.slug ?? "").trim();
  if (!isSubdomainSafeSlug(rowSlug)) return null;

  return { slug: rowSlug, updated_at: data.updated_at };
}

/** Distinct cities that have at least one restaurant (for city hub sitemaps). */
export async function fetchDistinctCitySlugs(): Promise<
  { slug: string; name: string }[]
> {
  const supabase = getSupabaseServer();
  if (!supabase) throw new SupabaseUnavailableError();

  const bySlug = new Map<string, string>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("city")
      .not("city", "is", null)
      .order("city", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throwIfSupabaseUnavailable(error, "city list fetch");
      throw error;
    }

    if (!data?.length) break;

    for (const row of data) {
      const name = String(row.city ?? "").trim();
      if (!name) continue;
      const slug = resolveCanonicalCitySlug(slugifyCity(name));
      if (!slug) continue;

      const existing = bySlug.get(slug);
      if (!existing || name.length > existing.length) {
        bySlug.set(slug, name);
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return [...bySlug.entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Max content/update time per canonical city slug (for city hub lastmod). */
export async function fetchCityLastModifiedMap(): Promise<Map<string, Date>> {
  const supabase = getSupabaseServer();
  if (!supabase) throw new SupabaseUnavailableError();

  const map = new Map<string, Date>();
  let offset = 0;

  while (true) {
    let data: Record<string, unknown>[] | null = null;
    let error = null as { message?: string } | null;

    const full = await supabase
      .from("restaurants")
      .select("city, updated_at, photos, menu_data, images_uploaded_at")
      .not("city", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (
      full.error &&
      /images_uploaded_at/i.test(full.error.message ?? "")
    ) {
      const fallback = await supabase
        .from("restaurants")
        .select("city, updated_at, photos, menu_data")
        .not("city", "is", null)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      data = fallback.data as Record<string, unknown>[] | null;
      error = fallback.error;
    } else {
      data = full.data as Record<string, unknown>[] | null;
      error = full.error;
    }

    if (error) {
      throwIfSupabaseUnavailable(error, "city lastmod fetch");
      throw error;
    }

    if (!data?.length) break;

    for (const row of data) {
      const name = String(row.city ?? "").trim();
      if (!name) continue;
      const citySlug = resolveCanonicalCitySlug(slugifyCity(name));
      if (!citySlug) continue;

      const rowForFreshness: RestaurantSitemapRow = {
        slug: "",
        updated_at: row.updated_at as string | null | undefined,
        photos: row.photos,
        menu_data: row.menu_data,
        images_uploaded_at: row.images_uploaded_at as string | null | undefined,
      };
      const candidate =
        sitemapLastModifiedForRestaurant(rowForFreshness) ??
        (row.updated_at ? new Date(String(row.updated_at)) : null);
      if (!candidate || Number.isNaN(candidate.getTime())) continue;

      const prev = map.get(citySlug);
      if (!prev || candidate > prev) map.set(citySlug, candidate);
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return map;
}

export function latestDateFromRows(rows: RestaurantSitemapRow[]): Date | undefined {
  let latest: Date | undefined;
  for (const row of rows) {
    const d = sitemapLastModifiedForRestaurant(row);
    if (!d) continue;
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

/** City hub pages on the apex domain. */
export function buildCitySitemapEntries(
  cities: { slug: string; name: string }[],
  lastModifiedByCity: Map<string, Date>
): MetadataRoute.Sitemap {
  const apex = getApexOrigin();

  const entries: MetadataRoute.Sitemap = [];

  for (const city of cities) {
    const lastModified = lastModifiedByCity.get(city.slug);
    entries.push({
      url: `${apex}${cityHubPath(city.slug)}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  return entries;
}

/** Main site pages on the apex domain. */
export function buildMainSiteSitemapEntries(
  siteLastModified?: Date
): MetadataRoute.Sitemap {
  const apex = getApexOrigin();
  const lastModified = siteLastModified;

  const withMod = (entry: MetadataRoute.Sitemap[number]) =>
    lastModified ? { ...entry, lastModified } : entry;

  return [
    withMod({
      url: apex,
      changeFrequency: "daily",
      priority: 1,
    }),
    withMod({
      url: `${apex}/search`,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
    withMod({
      url: `${apex}/city`,
      changeFrequency: "weekly",
      priority: 0.85,
    }),
    {
      url: `${apex}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${apex}/contact`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${apex}/privacy`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${apex}/terms-conditions`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}

/** Pages for a single restaurant subdomain (overview, menu, halal-info). */
export function buildRestaurantSitemapEntries(
  restaurant: RestaurantSitemapRow
): MetadataRoute.Sitemap {
  const lastModified = sitemapLastModifiedForRestaurant(restaurant);

  const mod = lastModified ? { lastModified } : {};

  return [
    {
      url: restaurantSubdomainUrl(restaurant.slug),
      ...mod,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: restaurantSubdomainUrl(restaurant.slug, "/menu"),
      ...mod,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: restaurantSubdomainUrl(restaurant.slug, "/halal-info"),
      ...mod,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}

/** Apex sitemap index: main site sitemap + one sitemap per restaurant subdomain. */
export function buildApexSitemapIndexEntries(
  restaurants: RestaurantSitemapRow[],
  opts?: { siteLastModified?: Date; citySitemapLastModified?: Date }
): SitemapIndexEntry[] {
  const apex = getApexOrigin();

  const entries: SitemapIndexEntry[] = [
    {
      loc: `${apex}/sitemap-main.xml`,
      ...(opts?.siteLastModified
        ? { lastModified: opts.siteLastModified }
        : {}),
    },
    {
      loc: `${apex}/sitemaps/cities.xml`,
      ...(opts?.citySitemapLastModified
        ? { lastModified: opts.citySitemapLastModified }
        : {}),
    },
  ];

  for (const restaurant of restaurants) {
    const lastModified = sitemapLastModifiedForRestaurant(restaurant);
    entries.push({
      loc: `${restaurantSubdomainUrl(restaurant.slug)}/sitemap.xml`,
      ...(lastModified ? { lastModified } : {}),
    });
  }

  return entries;
}

export const SITEMAP_CACHE_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": cacheControlHeader(CACHE_TTL.SITEMAP),
} as const;

export const ROBOTS_CACHE_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": cacheControlHeader(CACHE_TTL.SITEMAP),
} as const;
