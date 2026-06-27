export const runtime = "edge";

import { headers } from "next/headers";
import { RestaurantNavigation } from "@/components/layout/RestaurantNavigation";
import { fetchRestaurantBySlug } from "@/lib/supabase";
import { notFound } from "next/navigation";

/** Keep in sync with `CACHE_TTL.RESTAURANT` in lib/cache-config.ts */
export const revalidate = 1800;

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ restaurant: string }>;
}) {
  const { restaurant } = await params;
  const row = await fetchRestaurantBySlug(restaurant);
  if (!row) notFound();

  const hdrs = await headers();
  const onSubdomain = Boolean(hdrs.get("x-hrm-restaurant-slug"));

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50">
      <RestaurantNavigation
        slug={restaurant}
        restaurantName={row.name?.trim() || "Restaurant"}
        onSubdomain={onSubdomain}
      />
      {children}
    </div>
  );
}
