import type { ReactNode } from "react";
import { hasTakeaway } from "@/components/restaurant/RestaurantBadges";
import { formatTodayOpeningLine } from "@/lib/opening-hours-display";
import { googleMapsDirectionsUrl } from "@/lib/google-maps";
import { heroDescriptionSnippet } from "@/lib/hero-description";
import { restaurantPhotoPlaceholder } from "@/lib/restaurant-placeholders";
import type { Restaurant } from "@/types/restaurant";

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-7.5 9.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 6.848-8.674a.75.75 0 011.052-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StarRating({
  rating,
  count,
}: {
  rating: number;
  count: number;
}) {
  const rounded = Math.round(rating);
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="flex items-center gap-0.5 text-xl leading-none" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={i <= rounded ? "text-amber-500" : "text-amber-200/90"}
          >
            ⭐
          </span>
        ))}
      </span>
      <span className="text-xl font-bold text-zinc-900">{rating.toFixed(1)}</span>
      <span className="text-base text-zinc-600">
        ({count.toLocaleString()} review{count === 1 ? "" : "s"})
      </span>
    </div>
  );
}

function OpenStatusBadge({
  openStatus,
}: {
  openStatus: "open" | "closed" | "unknown";
}) {
  if (openStatus === "open") {
    return (
      <span className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md">
        Open now
      </span>
    );
  }
  if (openStatus === "closed") {
    return (
      <span className="inline-flex rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md">
        Closed now
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-lg bg-zinc-300/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-700">
      Hours unknown
    </span>
  );
}

function CuisineBadge({ cuisine }: { cuisine: string }) {
  const label = cuisine
    .split(/[,;/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");

  return (
    <span className="inline-flex rounded-full border border-amber-200/80 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 shadow-sm">
      {label}
    </span>
  );
}

function HalalCertifiedBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-500/30">
      <CheckIcon className="h-5 w-5 shrink-0" />
      Halal Certified ✓
    </span>
  );
}

function TagBadge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "outline";
}) {
  const styles =
    variant === "outline"
      ? "border-2 border-halal-300 bg-white text-halal-900"
      : "border border-halal-500/20 bg-halal-600 text-white";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wide shadow-sm ${styles}`}
    >
      {children}
    </span>
  );
}

function IconDirections() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
    </svg>
  );
}

type InfoCardConfig = {
  key: string;
  label: string;
  icon: ReactNode;
  iconWrapClass: string;
  content: ReactNode;
};

function HeroInfoBar({ restaurant }: { restaurant: Restaurant }) {
  const today = formatTodayOpeningLine(restaurant.opening_hours);

  const items: InfoCardConfig[] = [
    restaurant.phone
      ? {
          key: "phone",
          label: "Phone",
          iconWrapClass: "bg-sky-100 text-sky-600",
          icon: (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          ),
          content: (
            <a href={`tel:${restaurant.phone}`} className="text-base font-semibold text-zinc-900 hover:text-sky-700">
              {restaurant.phone}
            </a>
          ),
        }
      : null,
    restaurant.address
      ? {
          key: "address",
          label: "Address",
          iconWrapClass: "bg-rose-100 text-rose-600",
          icon: (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          ),
          content: (
            <p className="text-base font-medium leading-snug text-zinc-800">{restaurant.address}</p>
          ),
        }
      : null,
    {
      key: "hours",
      label: "Hours",
      iconWrapClass: "bg-amber-100 text-amber-700",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: <p className="text-base font-medium text-zinc-800">{today}</p>,
    },
    restaurant.website
      ? {
          key: "website",
          label: "Website",
          iconWrapClass: "bg-emerald-100 text-emerald-700",
          icon: (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          ),
          content: (
            <a
              href={restaurant.website}
              target="_blank"
              rel="noreferrer"
              className="text-base font-semibold text-emerald-800 hover:text-emerald-950"
            >
              Visit site →
            </a>
          ),
        }
      : null,
  ].filter(Boolean) as InfoCardConfig[];

  if (items.length === 0) return null;

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-start gap-4 rounded-2xl border border-white/60 bg-white p-5 shadow-lg shadow-zinc-900/5 ring-1 ring-zinc-100/80"
        >
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.iconWrapClass}`}
          >
            {item.icon}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {item.label}
            </p>
            <div className="mt-1.5">{item.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HeroPhotoStack({
  photoUrls,
  slug,
  restaurantName,
}: {
  photoUrls: string[];
  slug: string;
  restaurantName: string;
}) {
  const primary = photoUrls[0] ?? restaurantPhotoPlaceholder(slug, 0);
  const secondary = photoUrls[1] ?? photoUrls[0] ?? restaurantPhotoPlaceholder(slug, 1);

  return (
    <div id="photos" className="flex w-full max-w-full flex-col gap-3">
      <figure className="h-[300px] w-full max-w-full shrink-0 overflow-hidden rounded-[12px] bg-zinc-100 shadow-xl ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={primary}
          alt={`${restaurantName} — main photo`}
          className="block h-full w-full max-w-full object-cover object-center"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </figure>
      <figure className="h-[200px] w-full max-w-full shrink-0 overflow-hidden rounded-[12px] bg-zinc-100 shadow-lg ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={secondary}
          alt={`${restaurantName} — second photo`}
          className="block h-full w-full max-w-full object-cover object-center"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </figure>
    </div>
  );
}

export function HeroSection({
  restaurant,
  photoUrls,
  slug,
  averageRating,
  reviewCount,
  openStatus,
}: {
  restaurant: Restaurant;
  photoUrls: string[];
  slug: string;
  averageRating?: number | null;
  reviewCount?: number;
  openStatus: "open" | "closed" | "unknown";
}) {
  const status = String(restaurant.halal_status ?? "").toLowerCase();
  const isCertified = status === "certified";
  const cityLine = [restaurant.city, restaurant.country]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();

  const snippet = heroDescriptionSnippet(restaurant);
  const mapsUrl = googleMapsDirectionsUrl(restaurant);

  const displayRating =
    averageRating != null && reviewCount != null && reviewCount > 0
      ? averageRating
      : typeof restaurant.rating === "number"
        ? restaurant.rating
        : null;
  const displayCount =
    reviewCount != null && reviewCount > 0
      ? reviewCount
      : typeof restaurant.total_reviews === "number"
        ? restaurant.total_reviews
        : 0;
  const hasRating = displayRating != null && displayCount > 0;

  return (
    <section
      className="relative min-h-[600px] overflow-hidden border-b-2 border-halal-300/60"
      style={{
        background: "linear-gradient(180deg, #f0faf4 0%, #e8f5e9 100%)",
      }}
    >
      {/* Subtle texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231a7a4a' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(ellipse 70% 60% at 10% 20%, rgba(26, 122, 74, 0.07), transparent 55%),
            radial-gradient(ellipse 50% 40% at 90% 10%, rgba(26, 122, 74, 0.05), transparent 50%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[3fr_2fr] lg:gap-12">
          <div className="flex min-w-0 flex-col">
            {cityLine ? (
              <p className="inline-flex w-fit rounded-lg bg-white/70 px-4 py-2 text-xs font-bold tracking-[0.22em] text-halal-900 shadow-sm ring-1 ring-halal-200/50">
                {cityLine}
              </p>
            ) : null}

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:leading-[1.1]">
              {restaurant.name}
            </h1>

            {snippet ? (
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-700">
                {snippet}
              </p>
            ) : null}

            <div className="mt-5">
              {hasRating && displayRating != null ? (
                <StarRating rating={displayRating} count={displayCount} />
              ) : (
                <p className="text-base font-medium text-zinc-500">No reviews yet</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <OpenStatusBadge openStatus={openStatus} />
              {restaurant.cuisine_type ? (
                <CuisineBadge cuisine={restaurant.cuisine_type} />
              ) : null}
              {restaurant.price_range ? (
                <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200/80">
                  {restaurant.price_range}
                </span>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {isCertified ? <HalalCertifiedBadge /> : null}
              {hasTakeaway(restaurant) ? (
                <TagBadge>
                  <span aria-hidden>🥡</span> Takeaway
                </TagBadge>
              ) : null}
              {restaurant.pork_free ? (
                <TagBadge variant="outline">Pork free</TagBadge>
              ) : null}
              {restaurant.muslim_owned ? (
                <TagBadge variant="outline">Muslim owned</TagBadge>
              ) : null}
            </div>

            {restaurant.halal_certifier && (
              <p className="mt-4 text-sm font-medium text-halal-800">
                Certified by{" "}
                <span className="font-bold text-halal-950">
                  {restaurant.halal_certifier}
                </span>
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-halal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-halal-700/25 transition hover:bg-halal-700"
                >
                  Call restaurant
                </a>
              )}
              {restaurant.website && (
                <a
                  href={restaurant.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-xl border-2 border-zinc-200/90 bg-white px-8 py-3.5 text-base font-semibold text-zinc-800 shadow-md transition hover:border-halal-400 hover:text-halal-900"
                >
                  Visit website
                </a>
              )}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-zinc-200/90 bg-white px-8 py-3.5 text-base font-semibold text-zinc-800 shadow-md transition hover:border-sky-300 hover:text-sky-900"
                >
                  <IconDirections />
                  Directions
                </a>
              )}
            </div>

            <HeroInfoBar restaurant={restaurant} />
          </div>

          <div className="w-full min-w-0 max-w-[500px] justify-self-stretch lg:justify-self-end">
            <HeroPhotoStack
              photoUrls={photoUrls}
              slug={slug}
              restaurantName={restaurant.name}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
