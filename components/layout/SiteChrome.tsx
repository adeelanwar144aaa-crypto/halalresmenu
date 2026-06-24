import { headers } from "next/headers";
import {
  Footer,
  type FooterRestaurantCity,
} from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { cityDisplayName, slugifyCity } from "@/lib/city-slug";
import { isRestaurantPathname } from "@/lib/restaurant-route";
import { fetchRestaurantBySlug } from "@/lib/supabase";

async function resolveFooterRestaurantCity(
  slug: string
): Promise<FooterRestaurantCity | null> {
  const row = await fetchRestaurantBySlug(slug);
  const cityRaw = row?.city?.trim();
  if (!cityRaw) return null;

  const citySlug = slugifyCity(cityRaw);
  if (!citySlug) return null;

  return {
    name: cityDisplayName(citySlug) || cityRaw,
    slug: citySlug,
  };
}

/**
 * Site chrome: marketing header on apex pages; shared footer everywhere
 * (including restaurant subdomains with a city-specific Explore link).
 */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const pathname = hdrs.get("x-hrm-pathname") ?? "/";
  const subdomainSlug = hdrs.get("x-hrm-restaurant-slug");
  const showMarketingHeader =
    !subdomainSlug && !isRestaurantPathname(pathname);

  const restaurantCity = subdomainSlug
    ? await resolveFooterRestaurantCity(subdomainSlug)
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      {showMarketingHeader && <Header />}
      <main className="flex-1">{children}</main>
      <Footer restaurantCity={restaurantCity} />
    </div>
  );
}
