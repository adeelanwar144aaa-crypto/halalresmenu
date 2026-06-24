import { citySlugToPattern, slugifyCity } from "@/lib/city-slug";
import { getSupabaseServer } from "@/lib/supabase";

export type CityWithCount = {
  slug: string;
  name: string;
  count: number;
};

export const CITY_PAGE_SIZE = 50;

export type CityRestaurant = {
  slug: string;
  name: string;
  city: string | null;
  cuisine_type: string | null;
  photos: unknown;
};

export type CityRestaurantsResult = {
  restaurants: CityRestaurant[];
  total: number;
};

/**
 * Same filter as /search?city=X — ilike on restaurants.city, ordered by name.
 */
export async function fetchCityRestaurants(
  citySlug: string,
  options: { limit?: number; offset?: number } = {}
): Promise<CityRestaurantsResult> {
  const limit = options.limit ?? CITY_PAGE_SIZE;
  const offset = options.offset ?? 0;
  const pattern = citySlugToPattern(citySlug);

  const supabase = getSupabaseServer();
  if (!supabase) {
    return { restaurants: [], total: 0 };
  }

  const { count, error: countError } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true })
    .ilike("city", pattern);

  if (countError) {
    throw new Error(`city restaurant count: ${countError.message}`);
  }

  const { data, error } = await supabase
    .from("restaurants")
    .select("slug,name,city,cuisine_type,photos")
    .ilike("city", pattern)
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`city restaurants fetch: ${error.message}`);
  }

  return {
    restaurants: (data ?? []) as CityRestaurant[],
    total: count ?? 0,
  };
}

/** All restaurants in a city (for /city/[slug]/all crawlable page). */
export async function fetchAllCityRestaurants(
  citySlug: string
): Promise<CityRestaurant[]> {
  const pattern = citySlugToPattern(citySlug);
  const supabase = getSupabaseServer();
  if (!supabase) return [];

  const rows: CityRestaurant[] = [];
  let offset = 0;
  const pageSize = 500;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("slug,name,city,cuisine_type,photos")
      .ilike("city", pattern)
      .order("name", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`city restaurants fetch all: ${error.message}`);
    }

    if (!data?.length) break;
    rows.push(...(data as CityRestaurant[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

/** Distinct cities with published restaurant counts, largest first. */
export async function fetchCitiesWithCounts(): Promise<CityWithCount[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return [];

  const bySlug = new Map<string, { name: string; count: number }>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("city")
      .not("city", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`cities with counts: ${error.message}`);
    }

    if (!data?.length) break;

    for (const row of data) {
      const name = String(row.city ?? "").trim();
      if (!name) continue;
      const slug = slugifyCity(name);
      if (!slug) continue;

      const existing = bySlug.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        bySlug.set(slug, { name, count: 1 });
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return [...bySlug.entries()]
    .map(([slug, { name, count }]) => ({ slug, name, count }))
    .sort((a, b) => b.count - a.count);
}
