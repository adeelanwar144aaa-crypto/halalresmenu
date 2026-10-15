import { parseRestaurantPath } from "@/lib/restaurant-route";
import { restaurantSubdomainUrl } from "@/lib/utils";

export const RESTAURANT_HALAL_INFO_HASH = "halal-info";

/** True for `/halal-info` or `/{slug}/halal-info` (optional trailing slash). */
export function isHalalInfoRequestPath(pathname: string): boolean {
  const norm = pathname.replace(/\/$/, "") || "/";
  if (norm === "/halal-info") return true;
  return parseRestaurantPath(pathname)?.suffix === "/halal-info";
}

export function restaurantHalalInfoOverviewUrl(slug: string): string {
  return restaurantSubdomainUrl(slug, `/#${RESTAURANT_HALAL_INFO_HASH}`);
}

/** Path-based dev routing on apex localhost (`/{slug}#halal-info`). */
export function restaurantHalalInfoPathAnchor(origin: string, slug: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/${slug}#${RESTAURANT_HALAL_INFO_HASH}`;
}
