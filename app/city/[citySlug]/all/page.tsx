import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CityRestaurantList } from "@/components/city/CityRestaurantList";
import {
  cityAllPath,
  cityDisplayName,
  cityHubPath,
} from "@/lib/city-slug";
import { fetchAllCityRestaurants } from "@/lib/city-restaurants";
import { getApexOrigin } from "@/lib/sitemap-data";

export const runtime = "edge";

type PageProps = { params: Promise<{ citySlug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const name = cityDisplayName(citySlug);
  const canonical = `${getApexOrigin()}${cityAllPath(citySlug)}`;

  return {
    title: `All Halal Restaurants in ${name} | HalalResMenu`,
    description: `Complete directory of halal restaurants in ${name}. Every listing links to its subdomain with menu, reviews, and halal certification.`,
    alternates: { canonical },
    openGraph: {
      title: `All Halal Restaurants in ${name}`,
      description: `Complete halal restaurant directory for ${name}.`,
      url: canonical,
      siteName: "HalalResMenu",
      type: "website",
    },
  };
}

export default async function CityAllPage({ params }: PageProps) {
  const { citySlug } = await params;
  const normalized = citySlug.toLowerCase().trim();
  if (!normalized) notFound();

  const cityName = cityDisplayName(normalized);
  const restaurants = await fetchAllCityRestaurants(normalized);

  if (restaurants.length === 0) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href={cityHubPath(normalized)}
        className="text-sm font-semibold text-halal-700 transition hover:text-halal-900"
      >
        ← Back to {cityName} hub
      </Link>
      <h1 className="mt-6 font-serif text-3xl font-bold text-zinc-900">
        All halal restaurants in {cityName}
      </h1>
      <p className="mt-2 text-zinc-600">
        Complete list of {restaurants.length.toLocaleString()} restaurant
        {restaurants.length === 1 ? "" : "s"} — every link goes to the
        restaurant&apos;s subdomain.
      </p>

      <ul className="mt-10 space-y-4">
        <CityRestaurantList restaurants={restaurants} />
      </ul>
    </div>
  );
}
