import type { Metadata } from "next";

export const runtime = "edge";
import {
  hasTakeaway,
  TakeawayAvailableBadge,
} from "@/components/restaurant/RestaurantBadges";
import { MenuSection } from "@/components/restaurant/MenuSection";
import { createPageMetadata } from "@/components/seo/MetaTags";
import { SchemaMarkup } from "@/components/seo/SchemaMarkup";
import { parseMenuData } from "@/lib/menu-data";
import { fetchRestaurantBySlug } from "@/lib/supabase";
import { getSiteUrl, restaurantCanonicalUrl } from "@/lib/utils";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ restaurant: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { restaurant } = await params;
  const row = await fetchRestaurantBySlug(restaurant);
  if (!row) return { title: "Menu" };
  return createPageMetadata({
    title: `${row.name} — Menu`,
    description: `Menu for ${row.name}${row.city ? ` in ${row.city}` : ""}.`,
    canonicalPath: `/${restaurant}/menu`,
  });
}

export default async function RestaurantMenuPage({ params }: PageProps) {
  const { restaurant } = await params;
  const row = await fetchRestaurantBySlug(restaurant);
  if (!row) notFound();

  const menuData = parseMenuData(row.menu_data);
  const site = getSiteUrl();

  return (
    <>
      <SchemaMarkup
        restaurant={row}
        url={restaurantCanonicalUrl(restaurant, "/menu")}
        breadcrumbs={[
          { name: "Home", url: site },
          { name: row.name, url: restaurantCanonicalUrl(restaurant) },
          {
            name: "Menu",
            url: restaurantCanonicalUrl(restaurant, "/menu"),
          },
        ]}
      />
      <div className="border-b border-halal-100/60 bg-gradient-to-r from-halal-50/50 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {hasTakeaway(row) ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <TakeawayAvailableBadge />
            </div>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
            Full menu
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Menu
          </h1>
          <p className="mt-2 text-lg text-zinc-600">{row.name}</p>
        </div>
      </div>
      <MenuSection restaurant={row} menuData={menuData} suppressTitle />
    </>
  );
}
