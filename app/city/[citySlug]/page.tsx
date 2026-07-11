import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CityPageHero } from "@/components/city/CityPageHero";
import { CityPageSeoContent } from "@/components/city/CityPageSeoContent";
import { CityRestaurantBrowseSection } from "@/components/city/CityRestaurantBrowseSection";
import {
  cityDisplayName,
  cityHubPath,
  resolveCanonicalCitySlug,
} from "@/lib/city-slug";
import {
  buildCityMetaDescription,
  buildCityMetaTitle,
  buildCitySeoContext,
} from "@/lib/city-seo";
import {
  fetchCityRestaurantsBrowse,
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
  const canonical = `${getApexOrigin()}${cityHubPath(canonicalSlug)}`;

  let description = `Browse halal restaurants in ${name}. View menus, reviews, certification details, and local halal dining near you on HalalResMenu.`;

  try {
    const stats = await fetchCitySeoStats(canonicalSlug, name);
    const ctx = buildCitySeoContext({
      citySlug: canonicalSlug,
      cityName: name,
      total: stats.total,
      cuisineCounts: stats.cuisineCounts,
      areaCounts: stats.areaCounts,
    });
    description = buildCityMetaDescription(ctx);
  } catch {
    // Fallback description above
  }

  const title = buildCityMetaTitle(name);

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

export default async function CityHubPage({ params }: PageProps) {
  const { citySlug } = await params;
  const normalized = citySlug.toLowerCase().trim();
  if (!normalized) notFound();

  const canonical = resolveCanonicalCitySlug(normalized);
  if (canonical !== normalized) {
    redirect(cityHubPath(canonical));
  }

  const cityName = cityDisplayName(canonical);
  const [restaurants, seoStats] = await Promise.all([
    fetchCityRestaurantsBrowse(canonical, cityName),
    fetchCitySeoStats(canonical, cityName),
  ]);

  const total = restaurants.length;
  if (total === 0) notFound();

  const seoContext = buildCitySeoContext({
    citySlug: canonical,
    cityName,
    total,
    cuisineCounts: seoStats.cuisineCounts,
    areaCounts: seoStats.areaCounts,
  });


  return (
    <div>
      <CityPageHero cityName={cityName} citySlug={canonical} total={total} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/city"
          className="text-sm font-semibold text-halal-700 transition hover:text-halal-900"
        >
          ← All cities
        </Link>

        <CityPageSeoContent ctx={seoContext} />

        <section className="mt-14 border-t border-zinc-200/80 pt-12">
          <div>
            <h2 className="font-serif text-2xl font-bold text-zinc-900 sm:text-3xl">
              Halal restaurants in {cityName}
            </h2>
            <p className="mt-2 text-zinc-600">
              {total.toLocaleString()} listing{total === 1 ? "" : "s"} — each
              opens on its own page with menu and halal details.
            </p>
          </div>

          <CityRestaurantBrowseSection
            cityName={cityName}
            restaurants={restaurants}
          />
        </section>
      </div>
    </div>
  );
}
