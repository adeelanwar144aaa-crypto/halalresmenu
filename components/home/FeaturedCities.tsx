import Link from "next/link";
import { FEATURED_CITIES } from "@/lib/featured-cities";

export function FeaturedCities() {
  return (
    <section id="cities" className="scroll-mt-24 border-t border-zinc-200/80 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-halal-700">
            Explore by city
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Featured UK cities
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600">
            Start where Muslim communities have built thriving halal food
            cultures — from Bradford&apos;s curry heritage to Leicester&apos;s
            Golden Mile.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURED_CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/search?city=${encodeURIComponent(city.name)}`}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-halal-800 to-halal-950 p-6 text-white shadow-card ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-halal-500/20 blur-2xl transition group-hover:bg-halal-400/30"
                aria-hidden
              />
              <p className="text-xs font-semibold uppercase tracking-wider text-halal-200">
                {city.blurb}
              </p>
              <h3 className="mt-2 text-xl font-bold tracking-tight">
                {city.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-halal-100/90">
                {city.restaurantHint}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-halal-200 transition group-hover:text-white">
                View restaurants
                <span aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
