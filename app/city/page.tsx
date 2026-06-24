import type { Metadata } from "next";
import Link from "next/link";
import { cityDisplayName, cityHubPath } from "@/lib/city-slug";
import { fetchCitiesWithCounts } from "@/lib/city-restaurants";
import { getApexOrigin } from "@/lib/sitemap-data";

export const runtime = "edge";

const canonical = `${getApexOrigin()}/city`;

export const metadata: Metadata = {
  title: "Halal Restaurants by City | Browse All UK Cities | HalalResMenu",
  description:
    "Browse halal restaurant guides for cities across the UK. View menus, certification details, and neighbourhood dining on HalalResMenu.",
  alternates: { canonical },
  openGraph: {
    title: "Halal Restaurants by City | HalalResMenu",
    description:
      "Directory of UK cities with halal restaurant guides — menus, reviews, and halal certification details.",
    url: canonical,
    siteName: "HalalResMenu",
    type: "website",
  },
};

export default async function CitiesIndexPage() {
  const cities = await fetchCitiesWithCounts();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="text-sm font-semibold text-halal-700 transition hover:text-halal-900"
      >
        ← Back to home
      </Link>

      <h1 className="mt-6 font-serif text-3xl font-bold text-zinc-900 sm:text-4xl">
        Halal Restaurants by City
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-zinc-600">
        Explore halal dining guides for cities and towns across the UK. Each
        city page lists certified restaurants with full menus, prayer-aware
        context, and the neighbourhood detail you expect from a trusted halal
        guide.
      </p>

      {cities.length === 0 ? (
        <p className="mt-10 text-zinc-600">No cities available yet.</p>
      ) : (
        <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => {
            const name = cityDisplayName(city.slug);
            const countLabel = `${city.count.toLocaleString()} restaurant${
              city.count === 1 ? "" : "s"
            }`;

            return (
              <li key={city.slug}>
                <Link
                  href={cityHubPath(city.slug)}
                  className="group flex h-full flex-col rounded-2xl border border-zinc-100 bg-white p-6 shadow-card transition hover:border-halal-200 hover:shadow-card-hover"
                >
                  <h2 className="font-serif text-xl font-bold text-zinc-900 transition group-hover:text-halal-800">
                    {name}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">{countLabel}</p>
                  <span className="mt-auto pt-4 text-sm font-semibold text-halal-700 transition group-hover:text-halal-900">
                    View halal restaurants →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-16 max-w-3xl rounded-2xl border border-halal-100 bg-halal-50/50 px-6 py-8">
        <h2 className="font-serif text-lg font-bold text-zinc-900">
          Growing with every submission
        </h2>
        <p className="mt-3 leading-relaxed text-zinc-600">
          New cities appear here automatically as restaurants are added to
          HalalResMenu. If your area is not listed yet, check back soon — our
          directory expands as the community submits and verifies listings.
        </p>
      </section>
    </div>
  );
}
