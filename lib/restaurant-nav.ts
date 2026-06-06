export type RestaurantNavTarget =
  | "overview"
  | "menu"
  | "halal-info"
  | "reviews"
  | "prayer-times"
  | "nearby-mosques"
  | "location";

export const RESTAURANT_NAV_ITEMS: ReadonlyArray<{
  target: RestaurantNavTarget;
  label: string;
  page: "overview" | "menu" | "halal-info" | "anchor";
}> = [
  { target: "overview", label: "Overview", page: "overview" },
  { target: "menu", label: "Menu", page: "menu" },
  { target: "halal-info", label: "Halal Info", page: "halal-info" },
  { target: "reviews", label: "Reviews", page: "anchor" },
  { target: "prayer-times", label: "Prayer Times", page: "anchor" },
  { target: "nearby-mosques", label: "Nearby Mosques", page: "anchor" },
  { target: "location", label: "Location", page: "anchor" },
];

/** Public href for restaurant nav — subdomain URLs omit the slug path prefix. */
export function restaurantNavHref(
  slug: string,
  target: RestaurantNavTarget,
  onSubdomain: boolean
): string {
  if (onSubdomain) {
    switch (target) {
      case "overview":
        return "/#overview";
      case "menu":
        return "/menu";
      case "halal-info":
        return "/halal-info";
      case "reviews":
        return "/#reviews";
      case "prayer-times":
        return "/#prayer-times";
      case "nearby-mosques":
        return "/#nearby-mosques";
      case "location":
        return "/#location";
    }
  }

  const base = `/${slug}`;
  switch (target) {
    case "overview":
      return `${base}#overview`;
    case "menu":
      return `${base}/menu`;
    case "halal-info":
      return `${base}/halal-info`;
    case "reviews":
      return `${base}#reviews`;
    case "prayer-times":
      return `${base}#prayer-times`;
    case "nearby-mosques":
      return `${base}#nearby-mosques`;
    case "location":
      return `${base}#location`;
  }
}

export function isRestaurantNavItemActive(
  page: "overview" | "menu" | "halal-info" | "anchor",
  pathname: string,
  slug: string,
  onSubdomain: boolean
): boolean {
  if (page === "anchor") return false;

  const normalized = pathname.replace(/\/$/, "") || "/";

  if (onSubdomain) {
    if (page === "overview") return normalized === "/";
    if (page === "menu") return normalized === "/menu";
    if (page === "halal-info") return normalized === "/halal-info";
    return false;
  }

  const base = `/${slug}`;
  if (page === "overview") return normalized === base;
  if (page === "menu") return normalized === `${base}/menu`;
  if (page === "halal-info") return normalized === `${base}/halal-info`;
  return false;
}
