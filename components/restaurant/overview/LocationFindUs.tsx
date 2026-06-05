import type { Restaurant } from "@/types/restaurant";

export function LocationFindUs({ restaurant }: { restaurant: Restaurant }) {
  const lat = restaurant.latitude;
  const lng = restaurant.longitude;
  const mapsUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : restaurant.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
        : null;

  const embedUrl =
    lat != null && lng != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.015}%2C${lng + 0.02}%2C${lat + 0.015}&layer=mapnik&marker=${lat}%2C${lng}`
      : null;

  return (
    <section
      id="location"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-white py-14 sm:scroll-mt-36 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
          Visit
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Find us
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-zinc-700">
          {restaurant.address}
          {restaurant.city ? `, ${restaurant.city}` : ""}
          {restaurant.country ? `, ${restaurant.country}` : ""}.
        </p>
        {embedUrl && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 shadow-card ring-1 ring-black/[0.04]">
            <iframe
              title={`Map of ${restaurant.name}`}
              src={embedUrl}
              className="aspect-[16/9] w-full min-h-[280px] bg-zinc-100"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-xl bg-halal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-halal-600/20 transition hover:bg-halal-700"
            >
              Get directions
            </a>
          )}
        </div>
        {(restaurant.parking_info || restaurant.public_transport_info) && (
          <div className="mt-10 grid gap-6 border-t border-zinc-100 pt-10 sm:grid-cols-2">
            {restaurant.parking_info && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-900">
                  Parking
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {restaurant.parking_info}
                </p>
              </div>
            )}
            {restaurant.public_transport_info && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-900">
                  Public transport
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {restaurant.public_transport_info}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
