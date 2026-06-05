import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase";
import { haversineKm } from "@/lib/geo";
import { restaurantSubdomainUrl } from "@/lib/utils";
import type { Restaurant } from "@/types/restaurant";

type Neighbor = {
  slug: string;
  name: string;
  cuisine_type: string | null;
  latitude: number | null;
  longitude: number | null;
  km: number | null;
};

export async function NearbyHalalSEO({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const supabase = getSupabaseServer();
  let rows: Neighbor[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("restaurants")
      .select("slug,name,cuisine_type,latitude,longitude")
      .neq("id", restaurant.id)
      .limit(60);
    const list = (data ?? []) as Neighbor[];
    const lat = restaurant.latitude;
    const lng = restaurant.longitude;

    if (lat != null && lng != null) {
      rows = list
        .filter((r) => r.latitude != null && r.longitude != null)
        .map((r) => ({
          ...r,
          km: haversineKm(lat, lng, r.latitude!, r.longitude!),
        }))
        .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
    }

    if (rows.length < 5 && restaurant.city) {
      const { data: cityRows } = await supabase
        .from("restaurants")
        .select("slug,name,cuisine_type,latitude,longitude")
        .eq("city", restaurant.city)
        .neq("id", restaurant.id)
        .limit(20);
      const extra = (cityRows ?? []) as Neighbor[];
      const seen = new Set(rows.map((r) => r.slug));
      for (const e of extra) {
        if (rows.length >= 5) break;
        if (seen.has(e.slug)) continue;
        let km: number | null = null;
        if (
          lat != null &&
          lng != null &&
          e.latitude != null &&
          e.longitude != null
        ) {
          km = haversineKm(lat, lng, e.latitude, e.longitude);
        }
        rows.push({ ...e, km });
        seen.add(e.slug);
      }
    }

    if (rows.length === 0) {
      rows = list.slice(0, 5).map((r) => ({ ...r, km: null }));
    }

    rows = rows.slice(0, 5);
  }

  return (
    <section
      id="nearby-halal-restaurants"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-zinc-50/50 py-14 sm:scroll-mt-36 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
          Discover more
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Other halal restaurants nearby
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600">
          Explore more certified-friendly venues nearby — ideal for internal
          discovery and search engines.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {rows.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-600 sm:col-span-2 lg:col-span-5">
              Add more restaurants with coordinates or the same city to populate
              this row.
            </li>
          ) : (
            rows.map((n) => (
              <li key={n.slug}>
                <Link
                  href={restaurantSubdomainUrl(n.slug)}
                  className="group flex h-full flex-col rounded-2xl border border-zinc-100 bg-white p-4 shadow-card ring-1 ring-black/[0.03] transition hover:-translate-y-0.5 hover:border-halal-200 hover:shadow-card-hover"
                >
                  <p className="font-semibold text-zinc-900 group-hover:text-halal-800">
                    {n.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {n.cuisine_type ?? "Halal dining"}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-halal-800">
                    {n.km != null
                      ? `${n.km.toFixed(1)} km away`
                      : "Nearby listing"}
                  </p>
                  <span className="mt-2 text-xs font-medium text-halal-700">
                    Visit listing →
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
