import type { MetadataRoute } from "next";
import { cacheControlHeader, CACHE_TTL } from "@/lib/cache-config";
import { cityHubPath, resolveCanonicalCitySlug, slugifyCity } from "@/lib/city-slug";
import { latestSitemapDate } from "@/lib/sitemap-dates";
import { throwIfSupabaseUnavailable } from "@/lib/supabase-errors";
import { SupabaseUnavailableError } from "@/lib/supabase-unavailable";
import { isSubdomainSafeSlug } from "@/lib/subdomain-slug";
import { getSupabaseServer } from "@/lib/supabase";
import { getSiteUrl, restaurantSubdomainUrl } from "@/lib/utils";

const PAGE_SIZE = 1000;

/** Lightweight columns only — avoids menu_data/photos on edge (CPU/time limits). */
const RESTAURANT_SITEMAP_SELECT =
  "slug, city, updated_at, images_uploaded_at, content_generated_at";

export type RestaurantSitemapRow = {
  slug: string;
  updated_at?: string | null;
  images_uploaded_at?: string | null;
  content_generated_at?: string | null;
};

export function sitemapLastModifiedForRestaurant(
  row: RestaurantSitemapRow
): Date | undefined {
  return latestSitemapDate(
    row.images_uploaded_at,
    row.content_generated_at,
    row.updated_at
  );
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

function rowFromSitemapRecord(row: Record<string, unknown>): RestaurantSitemapRow | null {
  const slug = String(row.slug ?? "").trim();
  if (!isSubdomainSafeSlug(slug)) return null;
  return {
    slug,
    updated_at: row.updated_at as string | null | undefined,
    images_uploaded_at: row.images_uploaded_at as string | null | undefined,
    content_generated_at: row.content_generated_at as string | null | undefined,
  };
}

async function fetchSitemapRestaurantPages(
  select: string,
  context: string
): Promise<Record<string, unknown>[]> {
  const supabase = getSupabaseServer();
  if (!supabase) throw new SupabaseUnavailableError();

  const all: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    let data: Record<string, unknown>[] | null = null;
    let error = null as { message?: string } | null;

    const full = await supabase
      .from("restaurants")
      .select(select)
      .not("slug", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (
      full.error &&
      /images_uploaded_at|content_generated_at/i.test(full.error.message ?? "")
    ) {
      const fallback = await supabase
        .from("restaurants")
        .select("slug, city, updated_at")
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
      throwIfSupabaseUnavailable(error, context);
      throw error;
    }

    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

export async function fetchAllRestaurantSlugs(): Promise<RestaurantSitemapRow[]> {
  const data = await fetchSitemapRestaurantPages(
    RESTAURANT_SITEMAP_SELECT,
    "restaurants fetch"
  );
  const rows: RestaurantSitemapRow[] = [];
  for (const row of data) {
    const parsed = rowFromSitemapRecord(row);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

/** One paginated scan for apex index (restaurant list + city lastmod). */
export async function fetchSitemapIndexData(): Promise<{
  restaurants: RestaurantSitemapRow[];
  cityLastModified: Map<string, Date>;
}> {
  const data = await fetchSitemapRestaurantPages(
    RESTAURANT_SITEMAP_SELECT,
    "sitemap index fetch"
  );
  const restaurants: RestaurantSitemapRow[] = [];
  const cityLastModified = new Map<string, Date>();

  for (const row of data) {
    const parsed = rowFromSitemapRecord(row);
    if (parsed) restaurants.push(parsed);

    const name = String(row.city ?? "").trim();
    if (name) {
      const citySlug = resolveCanonicalCitySlug(slugifyCity(name));
      if (citySlug) {
        const candidate = sitemapLastModifiedForRestaurant(
          parsed ?? {
            slug: "",
            updated_at: row.updated_at as string | null | undefined,
            images_uploaded_at: row.images_uploaded_at as string | null | undefined,
            content_generated_at: row.content_generated_at as string | null | undefined,
          }
        );
        if (candidate) {
          const prev = cityLastModified.get(citySlug);
          if (!prev || candidate > prev) cityLastModified.set(citySlug, candidate);
        }
      }
    }
  }

  return { restaurants, cityLastModified };
}

/** Max lastmod across all restaurants (for main site urlset). */
export async function fetchSiteLastModified(): Promise<Date | undefined> {
  const data = await fetchSitemapRestaurantPages(
    "updated_at, images_uploaded_at, content_generated_at",
    "site lastmod fetch"
  );
  let latest: Date | undefined;
  for (const row of data) {
    const d = latestSitemapDate(
      row.images_uploaded_at,
      row.content_generated_at,
      row.updated_at
    );
    if (d && (!latest || d > latest)) latest = d;
  }
  return latest;
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
    .select(
      "slug, updated_at, images_uploaded_at, content_generated_at"
    )
    .eq("slug", normalized)
    .maybeSingle();

  if (error) {
    throwIfSupabaseUnavailable(error, "restaurant sitemap row");
    return null;
  }
  if (!data) return null;

  const rowSlug = String(data.slug ?? "").trim();
  if (!isSubdomainSafeSlug(rowSlug)) return null;

  return {
    slug: rowSlug,
    updated_at: data.updated_at,
    images_uploaded_at: data.images_uploaded_at,
    content_generated_at: data.content_generated_at,
  };
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
  const { cityLastModified } = await fetchSitemapIndexData();
  return cityLastModified;
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
