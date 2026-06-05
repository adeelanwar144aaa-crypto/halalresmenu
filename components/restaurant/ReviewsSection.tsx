import type { Review } from "@/types/restaurant";
import { SectionHeading } from "@/components/restaurant/SectionHeading";

export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  return (
    <section
      id="reviews"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-white py-12 sm:scroll-mt-36 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Guest reviews"
          subtitle="Ratings and comments from diners and partner sources."
          eyebrow="Social proof"
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {reviews.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-8 text-center text-sm text-zinc-600 md:col-span-2">
              No reviews yet. They will appear here once added to the{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-zinc-800">
                reviews
              </code>{" "}
              table.
            </li>
          ) : (
            reviews.map((r) => (
              <li
                key={r.id}
                className="flex flex-col rounded-2xl border border-zinc-100 bg-gradient-to-br from-white to-zinc-50/80 p-5 shadow-card ring-1 ring-black/[0.03]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-zinc-900">
                    {r.author_name ?? "Guest"}
                  </p>
                  {r.rating != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">
                      {r.rating.toFixed(1)}
                      <span className="text-amber-700/80">/5</span>
                    </span>
                  )}
                </div>
                {r.source && (
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {r.source}
                    {r.is_verified ? " · Verified" : ""}
                  </p>
                )}
                {r.content && (
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-700">
                    “{r.content}”
                  </p>
                )}
                {r.date && (
                  <p className="mt-4 text-xs text-zinc-500">{r.date}</p>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
