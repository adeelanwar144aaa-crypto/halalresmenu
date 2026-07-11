import { FEATURED_CITIES } from "@/lib/featured-cities";

export type CityCuisineStat = {
  name: string;
  count: number;
};

export type CitySeoContext = {
  cityName: string;
  citySlug: string;
  total: number;
  topCuisines: CityCuisineStat[];
  localAreas: string[];
  dishKeywords: string[];
};

const GENERIC_DISHES = [
  "burgers",
  "kebabs",
  "biryani",
  "curry",
  "pizza",
  "fried chicken",
  "shawarma",
  "grills",
  "desserts",
  "family meals",
];

const CUISINE_DISHES: Record<string, string[]> = {
  indian: ["biryani", "curry", "tandoori", "naan", "samosa"],
  pakistani: ["biryani", "karahi", "seekh kebab", "nihari", "halwa puri"],
  turkish: ["doner kebab", "lahmacun", "grilled meats", "mezze"],
  lebanese: ["shawarma", "falafel", "grills", "hummus"],
  "middle eastern": ["shawarma", "mixed grills", "mezze", "falafel"],
  afghan: ["kabuli pulao", "mantu", "kebabs", "bolani"],
  chinese: ["noodles", "rice dishes", "sizzling platters", "dim sum"],
  bangladeshi: ["biryani", "curry", "fish dishes", "pitha"],
  italian: ["pizza", "pasta", "calzone"],
  american: ["burgers", "fried chicken", "wings", "steaks"],
  mediterranean: ["grills", "wraps", "salads", "seafood"],
};

function normalizeCuisineKey(value: string): string {
  return value.toLowerCase().trim();
}

function titleCaseArea(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Pull neighbourhood / town hints from a UK-style address line. */
export function extractLocalAreaFromAddress(
  address: string,
  cityName: string
): string | null {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;

  const cityLower = cityName.toLowerCase();
  const filtered = parts.filter((part) => {
    const lower = part.toLowerCase();
    if (lower === cityLower) return false;
    if (/^[A-Z]{1,2}\d[\dA-Z]?\s*\d[A-Z]{2}$/i.test(part)) return false;
    if (/^uk$/i.test(part)) return false;
    if (/^\d/.test(part)) return false;
    if (part.length < 3 || part.length > 48) return false;
    return true;
  });

  const candidate = filtered[filtered.length - 1];
  if (!candidate) return null;

  const normalized = titleCaseArea(candidate);
  if (normalized.toLowerCase() === cityLower) return null;
  return normalized;
}

export function buildDishKeywords(topCuisines: CityCuisineStat[]): string[] {
  const dishes = new Set<string>();

  for (const cuisine of topCuisines.slice(0, 5)) {
    const key = normalizeCuisineKey(cuisine.name);
    const mapped =
      Object.entries(CUISINE_DISHES).find(([k]) => key.includes(k))?.[1] ??
      null;
    if (mapped) {
      for (const dish of mapped) dishes.add(dish);
    }
  }

  for (const dish of GENERIC_DISHES) {
    if (dishes.size >= 10) break;
    dishes.add(dish);
  }

  return [...dishes].slice(0, 10);
}

export function getFeaturedCityHint(citySlug: string): string | null {
  return (
    FEATURED_CITIES.find((c) => c.slug === citySlug)?.restaurantHint ?? null
  );
}

export function buildCitySeoContext(input: {
  citySlug: string;
  cityName: string;
  total: number;
  cuisineCounts: Map<string, number>;
  areaCounts: Map<string, number>;
}): CitySeoContext {
  const topCuisines = [...input.cuisineCounts.entries()]
    .map(([name, count]) => ({ name: titleCaseArea(name), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const localAreas = [...input.areaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => titleCaseArea(name))
    .slice(0, 8);

  return {
    cityName: input.cityName,
    citySlug: input.citySlug,
    total: input.total,
    topCuisines,
    localAreas,
    dishKeywords: buildDishKeywords(topCuisines),
  };
}

export function buildCityMetaTitle(cityName: string): string {
  return `Halal Restaurants in ${cityName} Near Me | Menus & Reviews (Updated 2026)`;
}

export function buildCityMetaDescription(ctx: CitySeoContext): string {
  const cuisinePart =
    ctx.topCuisines.length > 0
      ? ctx.topCuisines
          .slice(0, 4)
          .map((c) => c.name.toLowerCase())
          .join(", ")
      : "halal cuisine";

  const areaPart =
    ctx.localAreas.length > 0
      ? ` and nearby areas such as ${ctx.localAreas.slice(0, 3).join(", ")}`
      : "";

  return `Find ${ctx.total.toLocaleString()}+ halal restaurants in ${ctx.cityName}${areaPart}. Browse ${cuisinePart} menus, takeaway, delivery, and trusted halal dining near you on HalalResMenu.`;
}

export function buildCityAllMetaTitle(cityName: string): string {
  return `All Halal Restaurants in ${cityName} | Full Directory (Updated 2026)`;
}

export function buildCityAllMetaDescription(ctx: CitySeoContext): string {
  return `Complete directory of ${ctx.total.toLocaleString()} halal restaurants in ${ctx.cityName}. Compare cuisines, menus, opening hours, and local halal food options near you.`;
}

export function formatCuisineList(cuisines: CityCuisineStat[], max = 5): string {
  if (cuisines.length === 0) return "halal restaurants";
  return cuisines
    .slice(0, max)
    .map((c) => c.name.toLowerCase())
    .join(", ");
}
