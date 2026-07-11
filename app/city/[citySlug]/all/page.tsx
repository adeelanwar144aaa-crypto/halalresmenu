import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CityRestaurantList } from "@/components/city/CityRestaurantList";
import {
  cityAllPath,
  cityDisplayName,
  cityHubPath,
  resolveCanonicalCitySlug,
} from "@/lib/city-slug";
import {
  buildCityAllMetaDescription,
  buildCityAllMetaTitle,
  buildCitySeoContext,
} from "@/lib/city-seo";
import {
  fetchAllCityRestaurants,
  fetchCitySeoStats,
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
  const canonicalSlug = resolveCanonicalCitySlug(citySlug);
  const name = cityDisplayName(canonicalSlug);
  const canonical = `${getApexOrigin()}${cityAllPath(canonicalSlug)}`;
  const title = buildCityAllMetaTitle(name);

  let description = `Complete directory of halal restaurants in ${name}. Every listing links to its subdomain with menu, reviews, and halal certification.`;

  try {
    const stats = await fetchCitySeoStats(canonicalSlug, name);
    const ctx = buildCitySeoContext({
      citySlug: canonicalSlug,
      cityName: name,
      total: stats.total,
      cuisineCounts: stats.cuisineCounts,
      areaCounts: stats.areaCounts,
    });
    description = buildCityAllMetaDescription(ctx);
  } catch {
    // fallback above
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
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

  const canonical = resolveCanonicalCitySlug(normalized);
  if (canonical !== normalized) {
    redirect(cityAllPath(canonical));
  }

  const cityName = cityDisplayName(canonical);
  const restaurants = await fetchAllCityRestaurants(canonical);

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
        All halal restaurants in {cityName} — full directory
      </h1>
      <p className="mt-2 text-zinc-600">
        Complete list of {restaurants.length.toLocaleString()} halal restaurant
        {restaurants.length === 1 ? "" : "s"} in {cityName} and nearby listings.
        Compare cuisines, menus, and local halal food options near you.
      </p>

      <ul className="mt-10 space-y-4">
        <CityRestaurantList restaurants={restaurants} />
      </ul>
    </div>
  );
}
