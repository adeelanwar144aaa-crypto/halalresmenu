import {
  cityAllPath,
  cityHubPath,
  resolveCanonicalCitySlug,
  slugifyCity,
} from "@/lib/city-slug";
import { getApexOrigin } from "@/lib/apex-origin";
import { getGeneratedDeletedRedirect } from "@/lib/deleted-redirects-edge";
import { getDeadSubdomainRedirect } from "@/lib/dead-subdomain-redirects";
import { getLegacyApexRedirect } from "@/lib/legacy-apex-path-redirects";
import { restaurantSubdomainUrl } from "@/lib/utils";

export { getDeadSubdomainRedirect, getLegacyApexRedirect };

/** @deprecated Import from dead-subdomain-redirects — kept for scripts/docs. */
export const DEAD_SUBDOMAIN_REDIRECTS: Record<string, string> = {
  "bengal-spice-southampton": restaurantSubdomainUrl("bengal-spice-portsmouth"),
  miah: `${getApexOrigin()}/city`,
  "mughals-tandoori": cityHubPath("birmingham"),
  "indian-lantern": cityHubPath("southampton"),
  "kul-sumah-lounge": `${getApexOrigin()}/city`,
};

export async function getDeadSubdomainRedirectAsync(
  slug: string,
  originHint?: string
): Promise<string | null> {
  const key = slug.trim().toLowerCase();
  return (
    (await getGeneratedDeletedRedirect(key, originHint)) ??
    getDeadSubdomainRedirect(slug) ??
    null
  );
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
