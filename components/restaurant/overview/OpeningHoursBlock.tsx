import type { Restaurant } from "@/types/restaurant";
import {
  getRamadanRows,
  getWeekOpeningRows,
} from "@/lib/opening-hours-display";

export function OpeningHoursBlock({ restaurant }: { restaurant: Restaurant }) {
  const rows = getWeekOpeningRows(restaurant.opening_hours);
  const ramadan = getRamadanRows(restaurant.ramadan_hours ?? null);

  return (
    <section
      id="opening-hours"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-white py-14 sm:scroll-mt-36 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
          Plan your visit
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Opening hours
        </h2>
        <p className="mt-3 text-lg text-zinc-600">
          Weekly schedule in local listing format. Today is highlighted.
        </p>
        <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-100 shadow-card ring-1 ring-black/[0.03]">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Hours</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  className={
                    r.isToday
                      ? "bg-halal-50/80 font-semibold text-halal-950"
                      : "border-t border-zinc-100 bg-white"
                  }
                >
                  <td className="px-4 py-3">{r.label}</td>
                  <td className="px-4 py-3">{r.display}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ramadan && (
          <div className="mt-10">
            <h3 className="text-xl font-bold text-zinc-900">Ramadan hours</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Adjusted timings on file for the holy month (if provided).
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-halal-100 shadow-card">
              <table className="w-full text-left text-sm">
                <tbody>
                  {ramadan.map((r) => (
                    <tr key={r.key} className="border-t border-halal-50 bg-white first:border-t-0">
                      <td className="px-4 py-2.5 font-medium text-zinc-800">
                        {r.label}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-700">{r.display}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
