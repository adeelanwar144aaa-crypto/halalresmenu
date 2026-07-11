import type { CityRestaurantBrowse } from "@/lib/city-restaurants";

export type CitySortOption = "name-asc" | "name-desc" | "rating-desc";

export type CityFilterState = {
  query: string;
  sort: CitySortOption;
  cuisines: string[];
  halalStatuses: string[];
  priceRanges: string[];
  areas: string[];
  dineIn: boolean;
  takeaway: boolean;
  delivery: boolean;
  familyFriendly: boolean;
  prayerSpace: boolean;
  muslimOwned: boolean;
  porkFree: boolean;
  noAlcohol: boolean;
  catering: boolean;
  reservations: boolean;
  minRating: number | null;
};

export type CityFilterOptions = {
  cuisines: { value: string; count: number }[];
  halalStatuses: { value: string; label: string; count: number }[];
  priceRanges: { value: string; count: number }[];
  areas: { value: string; count: number }[];
};

export const EMPTY_CITY_FILTERS: CityFilterState = {
  query: "",
  sort: "name-asc",
  cuisines: [],
  halalStatuses: [],
  priceRanges: [],
  areas: [],
  dineIn: false,
  takeaway: false,
  delivery: false,
  familyFriendly: false,
  prayerSpace: false,
  muslimOwned: false,
  porkFree: false,
  noAlcohol: false,
  catering: false,
  reservations: false,
  minRating: null,
};

const HALAL_LABELS: Record<string, string> = {
  certified: "Certified halal",
  claimed_halal: "Claims halal",
  unknown: "Halal status unknown",
  not_certified: "Not certified",
};

function tally(map: Map<string, number>, value: string | null | undefined) {
  const key = String(value ?? "").trim();
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function buildCityFilterOptions(
  restaurants: CityRestaurantBrowse[]
): CityFilterOptions {
  const cuisines = new Map<string, number>();
  const halalStatuses = new Map<string, number>();
  const priceRanges = new Map<string, number>();
  const areas = new Map<string, number>();

  for (const r of restaurants) {
    tally(cuisines, r.cuisine_type);
    tally(halalStatuses, normalizeHalalStatus(r.halal_status));
    tally(priceRanges, r.price_range);
    const area = r.localArea?.trim();
    if (area) tally(areas, area);
  }

  const sortByCount = (entries: [string, number][]) =>
    entries
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  return {
    cuisines: sortByCount([...cuisines.entries()]),
    halalStatuses: sortByCount([...halalStatuses.entries()]).map((item) => ({
      ...item,
      label: HALAL_LABELS[item.value] ?? titleCase(item.value.replace(/_/g, " ")),
    })),
    priceRanges: sortByCount([...priceRanges.entries()]),
    areas: sortByCount([...areas.entries()]),
  };
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeHalalStatus(value: string | null | undefined): string {
  const key = String(value ?? "unknown").trim().toLowerCase();
  if (key in HALAL_LABELS) return key;
  return "unknown";
}

export function hasDineIn(r: CityRestaurantBrowse): boolean {
  return Boolean(r.dine_in ?? r.dine_in_available);
}

export function hasTakeaway(r: CityRestaurantBrowse): boolean {
  return Boolean(r.takeaway ?? r.has_takeaway ?? r.takeaway_available);
}

export function hasDelivery(r: CityRestaurantBrowse): boolean {
  return Boolean(r.delivery ?? r.has_delivery ?? r.delivery_available);
}

export function applyCityFilters(
  restaurants: CityRestaurantBrowse[],
  filters: CityFilterState
): CityRestaurantBrowse[] {
  const query = filters.query.trim().toLowerCase();

  let result = restaurants.filter((r) => {
    if (query) {
      const haystack = [r.name, r.cuisine_type, r.city, r.localArea]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (
      filters.cuisines.length > 0 &&
      !filters.cuisines.includes(String(r.cuisine_type ?? "").trim())
    ) {
      return false;
    }

    if (
      filters.halalStatuses.length > 0 &&
      !filters.halalStatuses.includes(normalizeHalalStatus(r.halal_status))
    ) {
      return false;
    }

    if (
      filters.priceRanges.length > 0 &&
      !filters.priceRanges.includes(String(r.price_range ?? "").trim())
    ) {
      return false;
    }

    if (
      filters.areas.length > 0 &&
      (!r.localArea || !filters.areas.includes(r.localArea))
    ) {
      return false;
    }

    if (filters.dineIn && !hasDineIn(r)) return false;
    if (filters.takeaway && !hasTakeaway(r)) return false;
    if (filters.delivery && !hasDelivery(r)) return false;
    if (filters.familyFriendly && !r.family_friendly) return false;
    if (filters.prayerSpace && !r.prayer_space) return false;
    if (filters.muslimOwned && !r.muslim_owned) return false;
    if (filters.porkFree && !r.pork_free) return false;
    if (filters.noAlcohol && r.alcohol_on_premises !== false) return false;
    if (filters.catering && !r.catering_available) return false;
    if (filters.reservations && !r.reservation_available) return false;

    if (filters.minRating != null) {
      const rating = Number(r.rating);
      if (!Number.isFinite(rating) || rating < filters.minRating) return false;
    }

    return true;
  });

  result = [...result].sort((a, b) => {
    if (filters.sort === "rating-desc") {
      const ar = Number(a.rating) || 0;
      const br = Number(b.rating) || 0;
      if (br !== ar) return br - ar;
    }
    const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    return filters.sort === "name-desc" ? -cmp : cmp;
  });

  return result;
}

export function countActiveCityFilters(filters: CityFilterState): number {
  let count = 0;
  if (filters.query.trim()) count += 1;
  if (filters.sort !== "name-asc") count += 1;
  count += filters.cuisines.length;
  count += filters.halalStatuses.length;
  count += filters.priceRanges.length;
  count += filters.areas.length;
  if (filters.dineIn) count += 1;
  if (filters.takeaway) count += 1;
  if (filters.delivery) count += 1;
  if (filters.familyFriendly) count += 1;
  if (filters.prayerSpace) count += 1;
  if (filters.muslimOwned) count += 1;
  if (filters.porkFree) count += 1;
  if (filters.noAlcohol) count += 1;
  if (filters.catering) count += 1;
  if (filters.reservations) count += 1;
  if (filters.minRating != null) count += 1;
  return count;
}

export function toggleFilterValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}
