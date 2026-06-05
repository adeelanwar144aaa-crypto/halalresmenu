import type { Restaurant } from "@/types/restaurant";

export function OverviewFooter({ restaurant }: { restaurant: Restaurant }) {
  const updated = restaurant.updated_at
    ? new Date(restaurant.updated_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  return (
    <footer className="border-t border-halal-100/80 bg-white py-12">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <a
            href={`mailto:claims@halalresmenu.com?subject=Claim%20${encodeURIComponent(restaurant.name)}`}
            className="inline-flex rounded-xl border border-halal-200 bg-halal-50 px-5 py-2.5 text-sm font-semibold text-halal-900 transition hover:bg-halal-100"
          >
            Claim this restaurant
          </a>
          <a
            href={`mailto:support@halalresmenu.com?subject=Incorrect%20information%20for%20${encodeURIComponent(restaurant.name)}`}
            className="inline-flex rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-halal-200"
          >
            Report incorrect information
          </a>
        </div>
        <p className="mt-6 text-xs text-zinc-500">Last updated: {updated}</p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
          Information is sourced from public listings and partner data. Halal
          practices can change — please call the restaurant and confirm before
          you visit.
        </p>
      </div>
    </footer>
  );
}
