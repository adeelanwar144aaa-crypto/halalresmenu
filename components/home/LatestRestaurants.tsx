import Link from "next/link";
import { LatestRestaurantCardImage } from "@/components/home/LatestRestaurantCardImage";
import { firstRestaurantPhotoUrl } from "@/lib/restaurant-photos";
import { restaurantSubdomainUrl } from "@/lib/utils";

export type LatestRestaurant = {
  slug: string;
  name: string;
  city: string | null;
  cuisine_type: string | null;
  logo_url?: string | null;
  photos?: unknown;
  created_at: string;
};

function formatAddedDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function restaurantCardPhoto(item: LatestRestaurant): string | null {
  return (
    firstRestaurantPhotoUrl(item.photos) ??
    (item.logo_url?.trim() ? item.logo_url.trim() : null)
  );
}

export function LatestRestaurants({ items }: { items: LatestRestaurant[] }) {
  return (
    <section className="border-t border-zinc-200/80 bg-zinc-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-halal-700">
              Fresh on the guide
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Latest additions
            </h2>
          </div>
          <Link
            href="/city"
            className="text-sm font-semibold text-halal-700 transition hover:text-halal-900"
          >
            Explore cities →
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="mt-10 text-zinc-600">
            New venues will appear here as they are added to the guide.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => {
              const photoUrl = restaurantCardPhoto(r);
              return (
                <article
                  key={r.slug}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/[0.04] transition hover:shadow-card-hover"
                >
                  <Link
                    href={restaurantSubdomainUrl(r.slug)}
                    className="relative block aspect-[16/10] overflow-hidden bg-zinc-100"
                  >
                    <LatestRestaurantCardImage name={r.name} photoUrl={photoUrl} />
                  </Link>
                  <div className="flex flex-1 flex-col p-6">
                    <time
                      dateTime={r.created_at}
                      className="text-xs font-medium uppercase tracking-wider text-zinc-400"
                    >
                      Added {formatAddedDate(r.created_at)}
                    </time>
                    <h3 className="mt-2 font-serif text-xl font-bold text-zinc-900">
                      <Link
                        href={restaurantSubdomainUrl(r.slug)}
                        className="transition hover:text-halal-800"
                      >
                        {r.name}
                      </Link>
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
                      {[r.cuisine_type, r.city].filter(Boolean).join(" · ") ||
                        "Halal restaurant"}
                    </p>
                    <Link
                      href={restaurantSubdomainUrl(r.slug)}
                      className="mt-4 inline-flex text-sm font-semibold text-halal-700 transition hover:text-halal-900"
                    >
                      Read venue guide →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
