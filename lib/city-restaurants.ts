import { extractLocalAreaFromAddress } from "@/lib/city-seo";
import { citySlugToPattern, resolveCanonicalCitySlug, slugifyCity } from "@/lib/city-slug";
import { throwIfSupabaseUnavailable } from "@/lib/supabase-errors";
import { SupabaseUnavailableError } from "@/lib/supabase-unavailable";
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

export type CityRestaurantBrowse = CityRestaurant & {
  halal_status: string | null;
  price_range: string | null;
  rating: number | null;
  dine_in: boolean | null;
  takeaway: boolean | null;
  delivery: boolean | null;
  dine_in_available: boolean | null;
  has_takeaway: boolean | null;
  has_delivery: boolean | null;
  takeaway_available: boolean | null;
  delivery_available: boolean | null;
  family_friendly: boolean | null;
  prayer_space: boolean | null;
  muslim_owned: boolean | null;
  pork_free: boolean | null;
  alcohol_on_premises: boolean | null;
  catering_available: boolean | null;
  reservation_available: boolean | null;
  localArea: string | null;
};

const BROWSE_SELECT =
  "slug,name,city,cuisine_type,photos,halal_status,price_range,rating,dine_in,takeaway,delivery,dine_in_available,has_takeaway,has_delivery,takeaway_available,delivery_available,family_friendly,prayer_space,muslim_owned,pork_free,alcohol_on_premises,catering_available,reservation_available,address";

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
  const pattern = citySlugToPattern(resolveCanonicalCitySlug(citySlug));

  const supabase = getSupabaseServer();
  if (!supabase) throw new SupabaseUnavailableError();

  const { count, error: countError } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true })
    .ilike("city", pattern);

  if (countError) {
    throwIfSupabaseUnavailable(countError, "city restaurant count");
    throw countError;
  }

  const { data, error } = await supabase
    .from("restaurants")
    .select("slug,name,city,cuisine_type,photos")
    .ilike("city", pattern)
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throwIfSupabaseUnavailable(error, "city restaurants fetch");
    throw error;
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
  const pattern = citySlugToPattern(resolveCanonicalCitySlug(citySlug));
  const supabase = getSupabaseServer();
  if (!supabase) throw new SupabaseUnavailableError();

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
      throwIfSupabaseUnavailable(error, "city restaurants fetch all");
      throw error;
    }

    if (!data?.length) break;
    rows.push(...(data as CityRestaurant[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

/** All restaurants in a city with fields needed for browse filters. */
export async function fetchCityRestaurantsBrowse(
  citySlug: string,
  cityName: string
): Promise<CityRestaurantBrowse[]> {
  const pattern = citySlugToPattern(resolveCanonicalCitySlug(citySlug));
  const supabase = getSupabaseServer();
  if (!supabase) throw new SupabaseUnavailableError();

  const rows: CityRestaurantBrowse[] = [];
  let offset = 0;
  const pageSize = 500;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select(BROWSE_SELECT)
      .ilike("city", pattern)
      .order("name", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throwIfSupabaseUnavailable(error, "city restaurants browse fetch");
      throw error;
    }

    if (!data?.length) break;

    for (const row of data) {
      const cityLabel = String(row.city ?? "").trim();
      let localArea: string | null = null;
      if (cityLabel && cityLabel.toLowerCase() !== cityName.toLowerCase()) {
        localArea = cityLabel;
      } else {
        localArea = extractLocalAreaFromAddress(
          String(row.address ?? ""),
          cityName
        );
      }

      const { address: _address, ...rest } = row;
      rows.push({
        ...(rest as Omit<CityRestaurantBrowse, "localArea">),
        localArea,
      });
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

export type CitySeoStats = {
  total: number;
  cuisineCounts: Map<string, number>;
  areaCounts: Map<string, number>;
};

function tallyCuisine(map: Map<string, number>, value: string | null) {
  const name = String(value ?? "").trim();
  if (!name || name.length < 2) return;
  const key = name.replace(/\s+/g, " ");
  map.set(key, (map.get(key) ?? 0) + 1);
}

function tallyArea(map: Map<string, number>, value: string | null) {
  const name = String(value ?? "").trim();
  if (!name || name.length < 2) return;
  const key = name.replace(/\s+/g, " ");
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Aggregate cuisines and local area labels for city SEO copy. */
export async function fetchCitySeoStats(
  citySlug: string,
  cityName: string
): Promise<CitySeoStats> {
  const pattern = citySlugToPattern(resolveCanonicalCitySlug(citySlug));
  const supabase = getSupabaseServer();
  if (!supabase) throw new SupabaseUnavailableError();

  const cuisineCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();
  let offset = 0;
  const pageSize = 1000;
  let total = 0;

  const { count, error: countError } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true })
    .ilike("city", pattern);

  if (countError) {
    throwIfSupabaseUnavailable(countError, "city seo count");
    throw countError;
  }

  total = count ?? 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("cuisine_type,city,address")
      .ilike("city", pattern)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throwIfSupabaseUnavailable(error, "city seo stats");
      throw error;
    }

    if (!data?.length) break;

    for (const row of data) {
      tallyCuisine(cuisineCounts, row.cuisine_type);

      const cityLabel = String(row.city ?? "").trim();
      if (
        cityLabel &&
        cityLabel.toLowerCase() !== cityName.toLowerCase()
      ) {
        tallyArea(areaCounts, cityLabel);
      }

      const area = extractLocalAreaFromAddress(
        String(row.address ?? ""),
        cityName
      );
      if (area) tallyArea(areaCounts, area);
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return { total, cuisineCounts, areaCounts };
}

/** Distinct cities with published restaurant counts, largest first. */
export async function fetchCitiesWithCounts(): Promise<CityWithCount[]> {
  const supabase = getSupabaseServer();
  if (!supabase) throw new SupabaseUnavailableError();

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
      throwIfSupabaseUnavailable(error, "cities with counts");
      throw error;
    }

    if (!data?.length) break;

    for (const row of data) {
      const name = String(row.city ?? "").trim();
      if (!name) continue;
      const slug = resolveCanonicalCitySlug(slugifyCity(name));
      if (!slug) continue;

      const existing = bySlug.get(slug);
      if (existing) {
        existing.count += 1;
        if (name.length > existing.name.length) {
          existing.name = name;
        }
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
