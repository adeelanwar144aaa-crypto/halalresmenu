import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CityLoadMore } from "@/components/city/CityLoadMore";
import { CityRestaurantList } from "@/components/city/CityRestaurantList";
import {
  cityAllPath,
  cityDisplayName,
  cityHubPath,
} from "@/lib/city-slug";
import {
  CITY_PAGE_SIZE,
  fetchCityRestaurants,
} from "@/lib/city-restaurants";
import { getApexOrigin } from "@/lib/sitemap-data";

export const runtime = "edge";

/** Keep in sync with `CACHE_TTL.HOME_AND_CITY` in lib/cache-config.ts */
export const revalidate = 3600;

type PageProps = { params: Promise<{ citySlug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const name = cityDisplayName(citySlug);
  const canonical = `${getApexOrigin()}${cityHubPath(citySlug)}`;

  return {
    title: `Halal Restaurants in ${name} | HalalResMenu`,
    description: `Browse halal restaurants in ${name}. View menus, reviews, certification details, and prayer-aware dining info on HalalResMenu.`,
    alternates: { canonical },
    openGraph: {
      title: `Halal Restaurants in ${name}`,
      description: `Browse halal restaurants in ${name} on HalalResMenu.`,
      url: canonical,
      siteName: "HalalResMenu",
      type: "website",
    },
  };
}

export default async function CityHubPage({ params }: PageProps) {
  const { citySlug } = await params;
  const normalized = citySlug.toLowerCase().trim();
  if (!normalized) notFound();

  const cityName = cityDisplayName(normalized);
  const { restaurants, total } = await fetchCityRestaurants(normalized, {
    limit: CITY_PAGE_SIZE,
    offset: 0,
  });

  if (total === 0) notFound();

  const hasMore = total > CITY_PAGE_SIZE;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="text-sm font-semibold text-halal-700 transition hover:text-halal-900"
      >
        ← Back to home
      </Link>
      <h1 className="mt-6 font-serif text-3xl font-bold text-zinc-900">
        Halal restaurants in {cityName}
      </h1>
      <p className="mt-2 text-zinc-600">
        {total.toLocaleString()} restaurant{total === 1 ? "" : "s"} in{" "}
        {cityName}. Each listing opens on its own subdomain with full menu and
        halal details.
      </p>
      <p className="mt-3 text-sm text-zinc-500">
        <Link
          href={cityAllPath(normalized)}
          className="font-semibold text-halal-700 underline decoration-halal-200 underline-offset-2 hover:text-halal-900"
        >
          View complete list ({total.toLocaleString()})
        </Link>{" "}
        — full directory for this city.
      </p>

      <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <CityRestaurantList restaurants={restaurants} />
        <CityLoadMore
          citySlug={normalized}
          initialOffset={restaurants.length}
          hasMore={hasMore}
        />
      </ul>
    </div>
  );
}
