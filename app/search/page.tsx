import type { Metadata } from "next";

export const runtime = "edge";
import Link from "next/link";
import { RestaurantThumbnail } from "@/components/restaurant/RestaurantThumbnail";
import { firstRestaurantPhotoUrl } from "@/lib/restaurant-photos";
import { getSupabaseServer } from "@/lib/supabase";
import { restaurantSubdomainUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Search halal restaurants",
  description: "Find halal restaurants by city or name across the UK.",
};

type PageProps = {
  searchParams: Promise<{ q?: string; city?: string }>;
};

type SearchResult = {
  slug: string;
  name: string;
  city: string | null;
  cuisine_type: string | null;
  photos: unknown;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, city } = await searchParams;
  const query = (q ?? city ?? "").trim();
  const mode = city ? "city" : "name";

  let results: SearchResult[] = [];

  const supabase = getSupabaseServer();
  if (supabase && query.length >= 2) {
    const pattern = `%${query}%`;
    let request = supabase
      .from("restaurants")
      .select("slug,name,city,cuisine_type,photos")
      .limit(48);

    if (mode === "city") {
      request = request.ilike("city", pattern);
    } else {
      request = request.ilike("name", pattern);
    }

    const { data } = await request.order("name", { ascending: true });
    results = (data ?? []) as SearchResult[];
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="text-sm font-semibold text-halal-700 transition hover:text-halal-900"
      >
        ← Back to home
      </Link>
      <h1 className="mt-6 font-serif text-3xl font-bold text-zinc-900">
        Search results
      </h1>
      <p className="mt-2 text-zinc-600">
        {query
          ? mode === "city"
            ? `Restaurants in “${query}”`
            : `Matching “${query}”`
          : "Enter a city or restaurant name on the homepage to search."}
      </p>

      <ul className="mt-10 space-y-4">
        {results.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-zinc-600">
            {query.length < 2
              ? "Type at least two characters to search."
              : "No restaurants found. Try another city or spelling."}
          </li>
        ) : (
          results.map((r) => {
            const photoUrl = firstRestaurantPhotoUrl(r.photos);

            return (
              <li key={r.slug}>
                <Link
                  href={restaurantSubdomainUrl(r.slug)}
                  className="flex gap-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card transition hover:border-halal-200 hover:shadow-card-hover sm:p-5"
                >
                  <RestaurantThumbnail
                    name={r.name}
                    photoUrl={photoUrl}
                    className="h-20 w-20 sm:h-24 sm:w-24"
                    width={96}
                    height={96}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-zinc-900">{r.name}</span>
                    <span className="mt-1 block text-sm text-zinc-500">
                      {[r.cuisine_type, r.city].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
