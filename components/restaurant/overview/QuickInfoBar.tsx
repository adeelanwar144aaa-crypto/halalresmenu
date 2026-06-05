import type { ReactNode } from "react";
import type { Restaurant } from "@/types/restaurant";
import { formatTodayOpeningLine } from "@/lib/opening-hours-display";

function IconPhone() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}
function IconMap() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function ServiceChip({
  active,
  label,
  icon,
}: {
  active: boolean | null;
  label: string;
  icon: ReactNode;
}) {
  const on = active === true;
  return (
    <div
      className={`flex min-w-[5.5rem] flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center sm:min-w-0 sm:flex-none sm:px-3 ${
        on
          ? "border-halal-200 bg-halal-50 text-halal-900"
          : "border-zinc-100 bg-zinc-50 text-zinc-400"
      }`}
    >
      <span className={on ? "text-halal-700" : "text-zinc-400"}>{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
        {label}
      </span>
      <span className="hidden text-[10px] text-zinc-500 sm:inline">
        {on ? "Yes" : active === false ? "No" : "—"}
      </span>
    </div>
  );
}

function IconUtensils() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" d="M8 4v16M12 4v7m4-7v16M4 20h16" />
    </svg>
  );
}
function IconBag() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974a1.125 1.125 0 011.119 1.007z" />
    </svg>
  );
}
function IconBike() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5h2.25M9 18.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zm7.5 0a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM3.75 15h2.1l.9-3 3-9h3l1.5 4.5" />
    </svg>
  );
}

export function QuickInfoBar({ restaurant }: { restaurant: Restaurant }) {
  const today = formatTodayOpeningLine(restaurant.opening_hours);

  return (
    <div
      id="quick-info"
      className="border-b border-halal-100/80 bg-white shadow-sm"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 transition hover:border-halal-200 hover:bg-white"
              >
                <span className="mt-0.5 text-halal-700">
                  <IconPhone />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Phone
                  </p>
                  <p className="font-semibold text-zinc-900">{restaurant.phone}</p>
                </div>
              </a>
            )}
            {restaurant.address && (
              <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
                <span className="mt-0.5 text-halal-700">
                  <IconMap />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Address
                  </p>
                  <p className="text-sm font-medium leading-snug text-zinc-900">
                    {restaurant.address}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 sm:col-span-2 lg:col-span-1">
              <span className="mt-0.5 text-halal-700">
                <IconClock />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Opening hours today
                </p>
                <p className="text-sm font-medium text-zinc-900">{today}</p>
              </div>
            </div>
            {restaurant.website && (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 transition hover:border-halal-200 hover:bg-white"
              >
                <span className="mt-0.5 text-halal-700">
                  <IconGlobe />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Website
                  </p>
                  <p className="truncate text-sm font-semibold text-halal-800">
                    Visit site
                  </p>
                </div>
              </a>
            )}
          </div>
          <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
            <ServiceChip
              active={restaurant.dine_in_available}
              label="Dine-in"
              icon={<IconUtensils />}
            />
            <ServiceChip
              active={restaurant.takeaway_available}
              label="Takeaway"
              icon={<IconBag />}
            />
            <ServiceChip
              active={restaurant.delivery_available}
              label="Delivery"
              icon={<IconBike />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
