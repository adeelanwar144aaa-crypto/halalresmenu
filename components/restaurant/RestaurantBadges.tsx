import type { Restaurant } from "@/types/restaurant";

export function hasTakeaway(restaurant: Restaurant): boolean {
  return Boolean(restaurant.has_takeaway ?? restaurant.takeaway_available);
}

export function TakeawayAvailableBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-halal-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm ring-1 ring-halal-700/30">
      <BagIcon className="h-3.5 w-3.5" aria-hidden />
      Takeaway Available
    </span>
  );
}

function BagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        d="M8.125 3a1.875 1.875 0 113.75 0 .75.75 0 01-1.5 0 1.125 1.125 0 10-2.25 0 .75.75 0 01-1.5 0zM4.875 6A2.875 2.875 0 007.75 3.11h4.5a2.875 2.875 0 012.875 2.89v.235h.635a3.75 3.75 0 013.74 3.24l.54 4.186a2.25 2.25 0 01-2.237 2.524H3.187a2.25 2.25 0 01-2.237-2.524l.54-4.186a3.75 3.75 0 013.74-3.24h.635V6zM7.75 4.61a1.375 1.375 0 00-1.375 1.39v.235h6.25V6a1.375 1.375 0 00-1.375-1.39h-3.5zM3.187 9.75l-.54 4.186a.75.75 0 00.746.814h13.214a.75.75 0 00.746-.814l-.54-4.186H3.187z"
        clipRule="evenodd"
      />
    </svg>
  );
}
