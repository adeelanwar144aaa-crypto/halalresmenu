import Link from "next/link";
import { SectionErrorFallback } from "@/components/restaurant/SectionErrorFallback";
import { getMosquesForRestaurant, googleMapsDirectionsUrl } from "@/lib/mosques";
import { fetchPrayerTimesForCoordinates } from "@/lib/prayer-times";
import type { Restaurant } from "@/types/restaurant";
import { SectionHeading } from "@/components/restaurant/SectionHeading";

export async function NearbyMosques({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  try {
    return await NearbyMosquesContent({ restaurant });
  } catch (err) {
    console.error("NearbyMosques render failed:", err);
    return <SectionErrorFallback title="Nearby mosques" />;
  }
}

async function NearbyMosquesContent({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  if (restaurant.latitude == null || restaurant.longitude == null) {
    return (
      <section
        id="nearby-mosques"
        className="scroll-mt-32 border-b border-zinc-100/80 bg-white py-12 sm:scroll-mt-36 sm:py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Nearby mosques"
            subtitle="Add latitude and longitude to this restaurant to discover masjids within 2km."
          />
        </div>
      </section>
    );
  }

  const mosques = await getMosquesForRestaurant(restaurant);
  const hasStoredMosques =
    Array.isArray(restaurant.nearby_mosques) &&
    restaurant.nearby_mosques.length > 0;

  const timings = await Promise.all(
    mosques.slice(0, 5).map((m) =>
      fetchPrayerTimesForCoordinates({
        latitude: m.latitude,
        longitude: m.longitude,
      })
    )
  );

  return (
    <section
      id="nearby-mosques"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-zinc-50/40 py-12 sm:scroll-mt-36 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Nearby mosques"
          subtitle="Within 2km — walking estimates, directions, and today’s prayer snapshot (AlAdhan) per masjid."
          eyebrow="Community"
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {mosques.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-halal-200 bg-white px-5 py-8 text-center text-sm text-zinc-600 md:col-span-2">
              {hasStoredMosques
                ? "No mosques could be loaded from saved data."
                : process.env.GOOGLE_PLACES_API_KEY
                  ? "No mosques found within 2km. Run npm run download-photos-mosques to cache city mosques on all restaurants."
                  : "No mosques on file yet. Run npm run download-photos-mosques (or add GOOGLE_PLACES_API_KEY for live search)."}
            </li>
          ) : (
            mosques.map((m, idx) => {
              const t = timings[idx];
              const distKm = (
                (m.distanceMeters ?? 0) / 1000
              ).toFixed(2);
              const dir = googleMapsDirectionsUrl(
                m.latitude,
                m.longitude,
                m.name
              );
              return (
                <li
                  key={m.placeId}
                  className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-5 shadow-card ring-1 ring-black/[0.03] transition hover:border-halal-200/80 hover:shadow-card-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-zinc-900">
                        {m.name ?? "Mosque"}
                      </h3>
                      {m.vicinity && (
                        <p className="mt-1 text-sm text-zinc-600">{m.vicinity}</p>
                      )}
                    </div>
                    <Link
                      href={dir}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg bg-halal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-halal-700"
                    >
                      Directions
                    </Link>
                  </div>
                  <p className="mt-3 text-xs font-medium text-zinc-500">
                    {distKm} km
                    {m.walkingMinutes != null
                      ? ` · ~${m.walkingMinutes} min walk`
                      : ""}
                  </p>
                  {t && (
                    <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl bg-halal-50/60 p-3 text-xs text-zinc-800 ring-1 ring-halal-100/80">
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">Fajr</dt>
                        <dd className="font-medium">{t.fajr}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">Dhuhr</dt>
                        <dd className="font-medium">{t.dhuhr}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">Asr</dt>
                        <dd className="font-medium">{t.asr}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">Maghrib</dt>
                        <dd className="font-medium">{t.maghrib}</dd>
                      </div>
                      <div className="flex justify-between gap-2 sm:col-span-2">
                        <dt className="text-zinc-500">Isha</dt>
                        <dd className="font-medium">{t.isha}</dd>
                      </div>
                    </dl>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </section>
  );
}
