import { cityHubPath } from "@/lib/city-slug";
import { getApexOrigin } from "@/lib/apex-origin";
import { restaurantSubdomainUrl } from "@/lib/utils";

/** 301 targets for removed restaurant subdomains (slug no longer in database). */
const DEAD_SUBDOMAIN_REDIRECTS: Record<string, string> = {
  "bengal-spice-southampton": restaurantSubdomainUrl("bengal-spice-portsmouth"),
  miah: `${getApexOrigin()}/city`,
  "mughals-tandoori": cityHubPath("birmingham"),
  "indian-lantern": cityHubPath("southampton"),
  "kul-sumah-lounge": `${getApexOrigin()}/city`,
};

export function getDeadSubdomainRedirect(slug: string): string | null {
  return DEAD_SUBDOMAIN_REDIRECTS[slug.trim().toLowerCase()] ?? null;
}
