import type { Restaurant } from "@/types/restaurant";

function Pill({
  children,
  variant = "outline",
}: {
  children: React.ReactNode;
  variant?: "solid" | "outline" | "muted";
}) {
  const styles =
    variant === "solid"
      ? "border-transparent bg-halal-600 text-white shadow-sm"
      : variant === "muted"
        ? "border-zinc-200 bg-zinc-50 text-zinc-700"
        : "border-halal-200 bg-white text-halal-900";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}
    >
      {children}
    </span>
  );
}

export function HalalInfoSection({
  restaurant,
  compact,
}: {
  restaurant: Restaurant;
  compact?: boolean;
}) {
  const status = restaurant.halal_status ?? "unknown";

  return (
    <section
      className={
        compact
          ? ""
          : "mx-auto max-w-7xl border-b border-zinc-100/80 px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
      }
      aria-labelledby="halal-info-heading"
    >
      {!compact && (
        <h2
          id="halal-info-heading"
          className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl"
        >
          Halal information
        </h2>
      )}
      <div className={compact ? "" : "mt-8"}>
        <div className="flex flex-wrap gap-2">
          <Pill variant="solid">
            Halal: {String(status).replace(/_/g, " ")}
          </Pill>
          {restaurant.halal_certifier ? (
            <Pill variant="outline">
              Certifier: {restaurant.halal_certifier}
            </Pill>
          ) : null}
          {restaurant.muslim_owned ? (
            <Pill variant="outline">Muslim owned</Pill>
          ) : null}
          {restaurant.pork_free === true ? (
            <Pill variant="outline">Pork free</Pill>
          ) : restaurant.pork_free === false ? (
            <Pill variant="muted">Not marked pork-free</Pill>
          ) : (
            <Pill variant="muted">Pork-free unknown</Pill>
          )}
          {restaurant.prayer_space ? (
            <Pill variant="outline">Prayer space</Pill>
          ) : null}
          {restaurant.wudu_facilities ? (
            <Pill variant="outline">Wudu facilities</Pill>
          ) : null}
        </div>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Alcohol on premises
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">
              {restaurant.alcohol_on_premises === null
                ? "Unknown"
                : restaurant.alcohol_on_premises
                  ? "Yes"
                  : "No"}
            </dd>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Prayer space
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">
              {restaurant.prayer_space ? "Available" : "Not listed / no"}
            </dd>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Wudu facilities
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">
              {restaurant.wudu_facilities ? "Available" : "Not listed / no"}
            </dd>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 ring-1 ring-zinc-100 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Cross-contamination policy
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-zinc-800">
              {restaurant.cross_contamination_policy ??
                "No policy text stored yet."}
            </dd>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Last verified
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">
              {restaurant.halal_last_verified_at
                ? new Date(
                    restaurant.halal_last_verified_at
                  ).toLocaleDateString()
                : "Not recorded"}
            </dd>
          </div>
        </dl>
        <div className="mt-8 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-5 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-100/60">
          <strong className="font-semibold">Disclaimer:</strong> Halal practices
          can change. Please call the venue to confirm halal status,
          certification scope, alcohol service, and kitchen protocols before
          visiting.
        </div>
        <div className="mt-4">
          <a
            href={`mailto:support@halalresmenu.com?subject=Incorrect%20info%20for%20${encodeURIComponent(restaurant.name)}`}
            className="inline-flex rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-halal-300 hover:text-halal-900"
          >
            Report incorrect information
          </a>
        </div>
      </div>
    </section>
  );
}
