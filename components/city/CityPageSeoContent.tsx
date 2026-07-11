import Link from "next/link";
import type { ReactNode } from "react";
import type { CitySeoContext } from "@/lib/city-seo";
import { getFeaturedCityHint } from "@/lib/city-seo";
import { cityAllPath } from "@/lib/city-slug";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-serif text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
      {children}
    </h2>
  );
}

export function CityPageSeoContent({ ctx }: { ctx: CitySeoContext }) {
  const { cityName, citySlug, total, topCuisines, localAreas, dishKeywords } =
    ctx;
  const featuredHint = getFeaturedCityHint(citySlug);
  const cuisineLine = topCuisines
    .slice(0, 5)
    .map((c) => c.name.toLowerCase())
    .join(", ");

  return (
    <div className="mt-10 space-y-12">
      <section className="rounded-2xl border border-halal-100 bg-gradient-to-br from-halal-50/80 to-white px-6 py-8 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-halal-700">
          Near you in {cityName}
        </p>
        <SectionTitle>
          Find halal restaurants near me in {cityName}
        </SectionTitle>
        <div className="mt-4 space-y-4 text-base leading-relaxed text-zinc-600">
          <p>
            Searching for <strong>halal restaurants near me in {cityName}</strong>
            , <strong>halal food near me</strong>, or a{" "}
            <strong>restaurant menu near me</strong>? HalalResMenu lists{" "}
            {total.toLocaleString()} halal-friendly venues across {cityName} and
            surrounding neighbourhoods — with menus, opening hours, takeaway,
            delivery, and dining details where available.
          </p>
          <p>
            Whether you live in {cityName}, commute through the area, or are
            visiting for the first time, browse trusted halal restaurants,
            compare {cuisineLine || "local cuisines"}, and plan your next meal
            before you travel.
          </p>
          {featuredHint ? (
            <p className="text-zinc-500">{featuredHint}.</p>
          ) : null}
        </div>
      </section>

      {topCuisines.length > 0 ? (
        <section>
          <SectionTitle>
            Popular halal cuisines in {cityName}
          </SectionTitle>
          <p className="mt-3 max-w-3xl leading-relaxed text-zinc-600">
            Explore halal restaurants serving the cuisines people search for most
            in {cityName} — from local favourites to well-known chains.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {topCuisines.map((cuisine) => (
              <span
                key={cuisine.name}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm ring-1 ring-zinc-200/80"
              >
                {cuisine.name}
                <span className="ml-2 text-zinc-400">({cuisine.count})</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {localAreas.length > 0 ? (
        <section>
          <SectionTitle>
            Towns and neighbourhoods near {cityName}
          </SectionTitle>
          <p className="mt-3 max-w-3xl leading-relaxed text-zinc-600">
            Many diners also search for halal food in nearby towns, suburbs, and
            local areas around {cityName}. Listings on this page include venues
            linked to these locations:
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {localAreas.map((area) => (
              <span
                key={area}
                className="rounded-xl border border-zinc-200/80 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800"
              >
                Halal restaurants near {area}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {dishKeywords.length > 0 ? (
        <section>
          <SectionTitle>
            Dishes and menu types to explore in {cityName}
          </SectionTitle>
          <p className="mt-3 max-w-3xl leading-relaxed text-zinc-600">
            Browse restaurant menus featuring popular halal dishes and meal types
            across {cityName}:
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {dishKeywords.map((dish) => (
              <div
                key={dish}
                className="rounded-xl border border-zinc-200/80 bg-zinc-50 px-4 py-3 text-sm font-medium capitalize text-zinc-800"
              >
                {dish}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-8 sm:px-8">
        <SectionTitle>Frequently asked questions</SectionTitle>
        <dl className="mt-6 space-y-6">
          <div>
            <dt className="font-semibold text-zinc-900">
              Where can I find halal restaurants near me in {cityName}?
            </dt>
            <dd className="mt-2 leading-relaxed text-zinc-600">
              HalalResMenu lists {total.toLocaleString()} halal restaurants in{" "}
              {cityName}. Browse the directory below, open any venue for menus and
              reviews, or view the{" "}
              <Link
                href={cityAllPath(citySlug)}
                className="font-semibold text-halal-700 underline decoration-halal-200 underline-offset-2 hover:text-halal-900"
              >
                complete {cityName} list
              </Link>
              .
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-900">
              What types of halal food are available in {cityName}?
            </dt>
            <dd className="mt-2 leading-relaxed text-zinc-600">
              {topCuisines.length > 0
                ? `Popular options include ${formatCuisineList(topCuisines)} restaurants, plus takeaway, delivery, and dine-in venues across the city.`
                : `HalalResMenu lists a wide range of halal restaurants across ${cityName}, including takeaway, delivery, and dine-in options.`}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-900">
              Can I view restaurant menus before visiting {cityName}?
            </dt>
            <dd className="mt-2 leading-relaxed text-zinc-600">
              Yes. Many listings include menu information, prices where available,
              and popular dishes. Always confirm the latest menu and halal details
              directly with the restaurant before ordering or visiting.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function formatCuisineList(
  cuisines: CitySeoContext["topCuisines"],
  max = 5
): string {
  if (cuisines.length === 0) return "halal";
  const list = cuisines.slice(0, max).map((c) => c.name.toLowerCase());
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}
