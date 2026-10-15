export const runtime = "edge";

import { headers } from "next/headers";
import { RestaurantNavigation } from "@/components/layout/RestaurantNavigation";
import { fetchRestaurantChromeBySlug } from "@/lib/supabase";
import { notFound } from "next/navigation";

/** Keep in sync with `CACHE_TTL.RESTAURANT` in lib/cache-config.ts */
export const revalidate = 86400;

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ restaurant: string }>;
}) {
  const { restaurant } = await params;
  const row = await fetchRestaurantChromeBySlug(restaurant);
  if (!row) notFound();

  const hdrs = await headers();
  const onSubdomain = Boolean(hdrs.get("x-hrm-restaurant-slug"));

  return (
    <div className="min-h-screen bg-gradient-to-b from-theme-bg via-white to-theme-bg">
      <RestaurantNavigation
        slug={restaurant}
        restaurantName={row.name?.trim() || "Restaurant"}
        onSubdomain={onSubdomain}
      />
      {children}
    </div>
  );
}
