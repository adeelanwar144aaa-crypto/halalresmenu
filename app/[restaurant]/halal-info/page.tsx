import type { Metadata } from "next";
import { HalalInfoSection } from "@/components/restaurant/HalalInfoSection";
import {
  hasTakeaway,
  TakeawayAvailableBadge,
} from "@/components/restaurant/RestaurantBadges";
import { createPageMetadata } from "@/components/seo/MetaTags";
import { SchemaMarkup } from "@/components/seo/SchemaMarkup";
import { fetchRestaurantBySlug } from "@/lib/supabase";
import { getSiteUrl, restaurantCanonicalUrl } from "@/lib/utils";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ restaurant: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { restaurant } = await params;
  const row = await fetchRestaurantBySlug(restaurant);
  if (!row) return { title: "Halal info" };
  return createPageMetadata({
    title: `${row.name} — Halal information`,
    description: `Halal certification, facilities, and policies for ${row.name}.`,
    canonicalPath: `/${restaurant}/halal-info`,
  });
}

export default async function HalalInfoPage({ params }: PageProps) {
  const { restaurant } = await params;
  const row = await fetchRestaurantBySlug(restaurant);
  if (!row) notFound();

  const site = getSiteUrl();

  return (
    <>
      <SchemaMarkup
        restaurant={row}
        url={restaurantCanonicalUrl(restaurant, "/halal-info")}
        breadcrumbs={[
          { name: "Home", url: site },
          { name: row.name, url: restaurantCanonicalUrl(restaurant) },
          {
            name: "Halal info",
            url: restaurantCanonicalUrl(restaurant, "/halal-info"),
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
            Verification
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Halal information
          </h1>
          <p className="mt-2 text-lg text-zinc-600">{row.name}</p>
        </div>
      </div>
      <HalalInfoSection restaurant={row} />
    </>
  );
}
