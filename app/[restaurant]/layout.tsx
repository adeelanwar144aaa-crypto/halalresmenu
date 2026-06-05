export const runtime = "edge";

import { RestaurantNavigation } from "@/components/layout/RestaurantNavigation";
import { fetchRestaurantBySlug } from "@/lib/supabase";
import { notFound } from "next/navigation";

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50">
      <RestaurantNavigation slug={restaurant} restaurantName={row.name} />
      {children}
    </div>
  );
}
