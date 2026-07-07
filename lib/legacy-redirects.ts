import {
  cityAllPath,
  cityHubPath,
  resolveCanonicalCitySlug,
  slugifyCity,
} from "@/lib/city-slug";
import { getApexOrigin } from "@/lib/sitemap-data";
import { restaurantSubdomainUrl } from "@/lib/utils";

const LEGACY_APEX_PATH_REDIRECTS: Record<string, string> = {
  "/city-Cities": "/city",
  "/-Home": "/",
  "/city/stoke-on-trent": "/city/stoke",
  "/city/stoke-on-trent/all": "/city/stoke/all",
  "/bengal-spice-southampton/halal-info": restaurantSubdomainUrl(
    "bengal-spice-portsmouth"
  ),
};

/** 301 targets for removed restaurant subdomains (slug no longer in database). */
export const DEAD_SUBDOMAIN_REDIRECTS: Record<string, string> = {
  "bengal-spice-southampton": restaurantSubdomainUrl("bengal-spice-portsmouth"),
  miah: `${getApexOrigin()}/city`,
  "mughals-tandoori": cityHubPath("birmingham"),
  "indian-lantern": cityHubPath("southampton"),
  "kul-sumah-lounge": `${getApexOrigin()}/city`,
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

export function getDeadSubdomainRedirect(slug: string): string | null {
  return DEAD_SUBDOMAIN_REDIRECTS[slug.trim().toLowerCase()] ?? null;
}

/** Build apex city hub URL from a raw restaurant city field. */
export function restaurantCityHubUrl(cityRaw: string): string {
  const slug = resolveCanonicalCitySlug(slugifyCity(cityRaw));
  return `${getApexOrigin()}${cityHubPath(slug)}`;
}

export function restaurantCityAllUrl(cityRaw: string): string {
  const slug = resolveCanonicalCitySlug(slugifyCity(cityRaw));
  return `${getApexOrigin()}${cityAllPath(slug)}`;
}
