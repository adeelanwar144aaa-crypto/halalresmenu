import type { Metadata } from "next";
import Link from "next/link";
import { EditorialIntro } from "@/components/home/EditorialIntro";
import { FeaturedCities } from "@/components/home/FeaturedCities";
import { HomeHeroSearch } from "@/components/home/HomeHeroSearch";
import { LatestRestaurants } from "@/components/home/LatestRestaurants";
import { getSupabaseServer } from "@/lib/supabase";

/** Keep in sync with `CACHE_TTL.HOME_AND_CITY` in lib/cache-config.ts */
export const revalidate = 3600;

export const metadata: Metadata = {
  title:
    "HalalResMenu | Find Halal Restaurants, Menus & Prayer Times Near You",
  description:
    "Browse halal-certified restaurants, full menus, prayer times, and mosque locations across the UK. Find your nearest halal restaurant on HalalResMenu.",
};

export default async function HomePage() {
  const supabase = getSupabaseServer();
  let latest: {
    slug: string;
    name: string;
    city: string | null;
    cuisine_type: string | null;
    logo_url: string | null;
    photos: unknown;
    created_at: string;
  }[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("restaurants")
      .select("slug,name,city,cuisine_type,logo_url,photos,created_at")
      .order("created_at", { ascending: false })
      .limit(12);
    latest = (data ?? []) as typeof latest;
  }

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-halal-950 via-halal-900 to-halal-800 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 10% 20%, rgb(52 211 153 / 0.15), transparent 50%),
              radial-gradient(circle at 90% 10%, rgb(255 255 255 / 0.06), transparent 40%)`,
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:px-8 lg:pb-32 lg:pt-24">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-halal-200">
            The UK halal dining guide
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-center font-serif text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Where to eat halal — with the detail a good guide deserves
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-halal-100/90">
            Certification, menus, prayer times, and neighbourhood context for
            restaurants across Britain&apos;s Muslim communities.
          </p>
          <HomeHeroSearch />
          <p className="mt-8 text-center text-sm text-halal-200/80">
            <Link
              href="#cities"
              className="font-medium underline decoration-halal-400/50 underline-offset-4 transition hover:text-white"
            >
              Explore featured cities
            </Link>
            <span className="mx-2 text-halal-600">·</span>
            <Link
              href="#latest"
              className="font-medium underline decoration-halal-400/50 underline-offset-4 transition hover:text-white"
            >
              See what&apos;s new
            </Link>
          </p>
        </div>
      </section>

      <EditorialIntro />
      <FeaturedCities />
      <div id="latest">
        <LatestRestaurants items={latest} />
      </div>
    </>
  );
}
