import type { Restaurant } from "@/types/restaurant";
import { SectionHeading } from "@/components/restaurant/SectionHeading";

export function LocationSection({ restaurant }: { restaurant: Restaurant }) {
  const mapsUrl =
    restaurant.latitude != null && restaurant.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`
      : restaurant.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
        : null;

  return (
    <section
      id="location"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-gradient-to-b from-zinc-50/90 to-white py-12 sm:scroll-mt-36 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Location & contact"
          subtitle={restaurant.address ?? "Address on file."}
          eyebrow="Visit"
        />
        <dl className="mt-8 grid gap-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              City
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">
              {restaurant.city ?? "—"}
            </dd>
          </div>
          <div className="rounded-xl bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Country
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">
              {restaurant.country ?? "—"}
            </dd>
          </div>
          <div className="rounded-xl bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Phone
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">
              {restaurant.phone ?? "—"}
            </dd>
          </div>
          <div className="rounded-xl bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Coordinates
            </dt>
            <dd className="mt-1 font-mono text-xs font-medium text-zinc-800">
              {restaurant.latitude != null && restaurant.longitude != null
                ? `${restaurant.latitude.toFixed(4)}, ${restaurant.longitude.toFixed(4)}`
                : "—"}
            </dd>
          </div>
        </dl>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-halal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-halal-600/20 transition hover:bg-halal-700"
          >
            Open in Google Maps
          </a>
        )}
      </div>
    </section>
  );
}
