import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase";
import type { Restaurant } from "@/types/restaurant";
import { SectionHeading } from "@/components/restaurant/SectionHeading";

export async function NearbyRestaurants({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const supabase = getSupabaseServer();
  let neighbors: Pick<Restaurant, "slug" | "name" | "city" | "cuisine_type">[] =
    [];

  if (supabase && restaurant.city) {
    const { data } = await supabase
      .from("restaurants")
      .select("slug,name,city,cuisine_type")
      .eq("city", restaurant.city)
      .neq("id", restaurant.id)
      .limit(8);
    neighbors = (data ?? []) as typeof neighbors;
  }

  return (
    <section
      id="nearby-halal-restaurants"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-gradient-to-b from-white to-zinc-50/90 py-12 sm:scroll-mt-36 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Nearby halal restaurants"
          subtitle="Other verified listings in the same city (when city matches in Supabase)."
          eyebrow="Discover"
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {neighbors.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-600 sm:col-span-2 lg:col-span-3">
              No neighbors found yet. Add more venues with the same city to
              populate this grid.
            </li>
          ) : (
            neighbors.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/${n.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-zinc-100 bg-white p-5 shadow-card ring-1 ring-black/[0.03] transition hover:-translate-y-0.5 hover:border-halal-200 hover:shadow-card-hover"
                >
                  <p className="font-semibold text-zinc-900 group-hover:text-halal-800">
                    {n.name}
                  </p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {n.city}
                    {n.cuisine_type ? ` · ${n.cuisine_type}` : ""}
                  </p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-halal-700">
                    View listing →
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
