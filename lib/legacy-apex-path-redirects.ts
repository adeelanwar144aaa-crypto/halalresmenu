import { restaurantSubdomainUrl } from "@/lib/utils";

const LEGACY_APEX_PATH_REDIRECTS: Record<string, string> = {
  "/city-Cities": "/city",
  "/-Home": "/",
  "/city/stoke-on-trent": "/city/stoke",
  "/city/stoke-on-trent/all": "/city/stoke/all",
  "/bengal-spice-southampton/halal-info": `${restaurantSubdomainUrl(
    "bengal-spice-portsmouth"
  )}#halal-info`,
};

/** Resolve a legacy apex path to its canonical destination, if applicable. */
export function getLegacyApexRedirect(pathname: string): string | null {
  const path = pathname.replace(/\/$/, "") || "/";

  const exact = LEGACY_APEX_PATH_REDIRECTS[path];
  if (exact) return exact;

  const doubledCity = path.match(
    /^\/city\/([a-z0-9-]+)-[A-Z][a-zA-Z-]+(\/all)?$/
  );
  if (doubledCity) {
    const suffix = doubledCity[2] ?? "";
    return `/city/${doubledCity[1]}${suffix}`;
  }

  return null;
}
