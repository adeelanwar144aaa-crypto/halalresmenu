import { SectionErrorFallback } from "@/components/restaurant/SectionErrorFallback";
import { fetchJummahTime, fetchPrayerTimesForCoordinates } from "@/lib/prayer-times";
import { isOpenAtPrayerTime } from "@/lib/opening-hours";
import type { Restaurant } from "@/types/restaurant";

export async function PrayerTimes({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  try {
    return await PrayerTimesContent({ restaurant });
  } catch (err) {
    console.error("PrayerTimes render failed:", err);
    return <SectionErrorFallback title="Prayer times" />;
  }
}

async function PrayerTimesContent({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  if (restaurant.latitude == null || restaurant.longitude == null) {
    return (
      <section
        id="prayer-times"
        className="scroll-mt-32 border-b border-zinc-100/80 bg-white py-14 sm:scroll-mt-36 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
            Planning
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Prayer times
          </h2>
          <p className="mt-3 text-lg text-zinc-600">
            Coordinates are required for AlAdhan timings at this location.
          </p>
        </div>
      </section>
    );
  }

  const [timings, jummah] = await Promise.all([
    fetchPrayerTimesForCoordinates({
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    }),
    fetchJummahTime({
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    }),
  ]);

  const today = new Date();
  const dateLabel =
    timings?.gregorianDate ??
    timings?.dateReadable ??
    today.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const rows = timings
    ? [
        { label: "Fajr", time: timings.fajr },
        { label: "Sunrise", time: timings.sunrise },
        { label: "Dhuhr", time: timings.dhuhr },
        { label: "Asr", time: timings.asr },
        { label: "Maghrib", time: timings.maghrib },
        { label: "Isha", time: timings.isha },
      ]
    : [];

  const isFriday = today.getDay() === 5;

  return (
    <section
      id="prayer-times"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-white py-14 sm:scroll-mt-36 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
          Planning
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Prayer times
        </h2>
        <p className="mt-2 text-sm font-medium text-zinc-700">{dateLabel}</p>
        <p className="mt-2 text-sm text-zinc-600">
          Today&apos;s timings via{" "}
          <a
            className="font-semibold text-halal-700 underline decoration-halal-200 underline-offset-2 hover:text-halal-800"
            href="https://aladhan.com/prayer-times-api"
            target="_blank"
            rel="noreferrer"
          >
            AlAdhan
          </a>
          . Timezone:{" "}
          <span className="font-medium text-zinc-800">
            {timings?.timezone ?? "auto (by coordinates)"}
          </span>
          .
        </p>
        {!timings && (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Could not load timings. Check network access and optional{" "}
            <code className="rounded bg-white/80 px-1">ALADHAN_API_KEY</code>.
          </p>
        )}
        <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-card ring-1 ring-black/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-gradient-to-r from-halal-600 to-halal-700 text-xs font-semibold uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">Prayer</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Likely open?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((r) => {
                  const open = isOpenAtPrayerTime(
                    restaurant.opening_hours,
                    r.time
                  );
                  return (
                    <tr key={r.label} className="bg-white hover:bg-halal-50/40">
                      <td className="px-4 py-3.5 font-semibold text-zinc-900">
                        {r.label}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-zinc-800">
                        {r.time || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600">
                        {open === null
                          ? "Unknown (add structured opening_hours)"
                          : open
                            ? "Probably open"
                            : "Probably closed"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-halal-200 bg-gradient-to-br from-halal-50 to-white p-5 ring-1 ring-halal-100/60">
          <h3 className="text-sm font-bold uppercase tracking-wide text-halal-900">
            Jummah {isFriday ? "(today)" : "(Friday reference)"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-halal-900/90">
            {jummah
              ? `Reference time: ${jummah}. Confirm with the masjid.`
              : "Jummah time unavailable from the API response."}
          </p>
        </div>
      </div>
    </section>
  );
}
