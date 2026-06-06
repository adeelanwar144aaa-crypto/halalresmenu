import { headers } from "next/headers";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { isRestaurantPathname } from "@/lib/restaurant-route";

/**
 * Hides global marketing header/footer on restaurant routes and subdomain rewrites
 * so only the restaurant sticky nav appears at the top.
 */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const restaurantSlug = hdrs.get("x-hrm-restaurant-slug");
  const pathname = hdrs.get("x-hrm-pathname") ?? "/";
  const showMarketingChrome =
    !restaurantSlug && !isRestaurantPathname(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      {showMarketingChrome && <Header />}
      <main className="flex-1">{children}</main>
      {showMarketingChrome && <Footer />}
    </div>
  );
}
