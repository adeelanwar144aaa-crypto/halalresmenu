import type { Restaurant } from "@/types/restaurant";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-zinc-500">{label}</span>
      <span className="text-sm font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

export function HalalArticleBlock({ restaurant }: { restaurant: Restaurant }) {
  const status = String(restaurant.halal_status ?? "unknown").replace(/_/g, " ");
  const hand = restaurant.hand_slaughtered;
  const handLabel =
    hand === true ? "Yes" : hand === false ? "No" : "Not specified on listing";

  return (
    <section
      id="halal-information"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-zinc-50/50 py-14 sm:scroll-mt-36 sm:py-20"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
          Verification
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Halal information
        </h2>
        <div className="prose prose-zinc prose-lg mt-8 max-w-none">
          <p className="leading-relaxed text-zinc-700">
            {restaurant.name} publishes a{" "}
            <strong className="text-zinc-900">{status}</strong> halal profile
            {restaurant.halal_certifier
              ? ` with oversight from ${restaurant.halal_certifier}.`
              : "."}{" "}
            We summarise what is on file so you can plan with confidence — then
            confirm directly with the team before you travel.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-halal-100 bg-white shadow-card ring-1 ring-black/[0.03]">
          <div className="border-b border-halal-100 bg-halal-600 px-5 py-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-white">
              Certification
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {restaurant.halal_certifier ?? "Not listed"}
            </p>
          </div>
          <div className="divide-y divide-zinc-100 px-5">
            <Row
              label="Alcohol on premises"
              value={
                restaurant.alcohol_on_premises === null
                  ? "Unknown"
                  : restaurant.alcohol_on_premises
                    ? "Yes"
                    : "No"
              }
            />
            <Row
              label="Pork free"
              value={
                restaurant.pork_free === null
                  ? "Unknown"
                  : restaurant.pork_free
                    ? "Yes"
                    : "No"
              }
            />
            <Row label="Hand slaughtered" value={handLabel} />
            <Row
              label="Cross-contamination policy"
              value={
                restaurant.cross_contamination_policy ??
                "Not provided for this listing yet."
              }
            />
            <Row
              label="Last verified"
              value={
                restaurant.halal_last_verified_at
                  ? new Date(
                      restaurant.halal_last_verified_at
                    ).toLocaleDateString()
                  : "Not recorded"
              }
            />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-200/80 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
          <strong className="font-semibold">Disclaimer:</strong> Halal practices
          can change. Please call the venue to confirm halal status, slaughter
          method details, alcohol service, and kitchen protocols before
          visiting.
        </div>
        <a
          href={`mailto:support@halalresmenu.com?subject=Incorrect%20halal%20info%20for%20${encodeURIComponent(restaurant.name)}`}
          className="mt-4 inline-flex text-sm font-semibold text-halal-800 underline decoration-halal-200 underline-offset-2 hover:text-halal-900"
        >
          Report incorrect information
        </a>
      </div>
    </section>
  );
}
