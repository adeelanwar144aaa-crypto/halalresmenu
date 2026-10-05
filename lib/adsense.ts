import { isProductionSiteHost } from "@/lib/production-host";

export const ADSENSE_CLIENT_ID = "ca-pub-2261812492201764";

export const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;

/** Load AdSense only on halalresmenu.com and restaurant subdomains (not preview/localhost). */
export function shouldLoadAdSense(host: string | null | undefined): boolean {
  if (!host?.trim()) return false;
  return isProductionSiteHost(host);
}
