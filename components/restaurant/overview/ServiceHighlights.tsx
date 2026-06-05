import type { ReactElement } from "react";
import type { Restaurant } from "@/types/restaurant";

type Svc = {
  key: string;
  label: string;
  desc: string;
  active: boolean | null;
  Icon: () => ReactElement;
};

const IconDine = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M4 10V4M8 10V4M4 20h16M8 20V14" strokeLinecap="round" />
  </svg>
);
const IconTake = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
  </svg>
);
const IconDel = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconFam = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.813-2.148M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const IconPray = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-6-9h12" />
  </svg>
);
const IconParty = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);
const IconCater = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112-2h-2.5M12 8h-2.5M12 8h2M9.5 14H12m0 0h2.5m-2.5 0v2.5m0-2.5V14" />
  </svg>
);
const IconWudu = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-2 3-6 4-6 9a6 6 0 1012 0c0-5-4-6-6-9z" />
  </svg>
);

export function ServiceHighlights({ restaurant }: { restaurant: Restaurant }) {
  const services: Svc[] = [
    {
      key: "dine",
      label: "Dine-in",
      desc: "Tables for on-site dining when available.",
      active: restaurant.dine_in_available,
      Icon: IconDine,
    },
    {
      key: "take",
      label: "Takeaway",
      desc: "Collect orders to enjoy off-site.",
      active: restaurant.takeaway_available,
      Icon: IconTake,
    },
    {
      key: "del",
      label: "Delivery",
      desc: "Courier or platform delivery options.",
      active: restaurant.delivery_available,
      Icon: IconDel,
    },
    {
      key: "fam",
      label: "Family friendly",
      desc: "Welcoming for children and groups.",
      active: restaurant.family_friendly,
      Icon: IconFam,
    },
    {
      key: "pray",
      label: "Prayer space",
      desc: "Dedicated or flexible prayer area.",
      active: restaurant.prayer_space,
      Icon: IconPray,
    },
    {
      key: "party",
      label: "Party space",
      desc: "Larger bookings and celebrations.",
      active: restaurant.party_space,
      Icon: IconParty,
    },
    {
      key: "cat",
      label: "Catering",
      desc: "Off-site events and trays.",
      active: restaurant.catering_available,
      Icon: IconCater,
    },
    {
      key: "wudu",
      label: "Wudu facilities",
      desc: "Ablution-friendly wash areas.",
      active: restaurant.wudu_facilities,
      Icon: IconWudu,
    },
  ];

  return (
    <section
      id="highlights"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-zinc-50/40 py-14 sm:scroll-mt-36 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
          Experience
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Highlights
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600">
          What you can expect on arrival — from seating styles to faith-friendly
          amenities.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => {
            const Icon = s.Icon;
            const on = s.active === true;
            return (
              <li
                key={s.key}
                className={`flex flex-col rounded-2xl border bg-white p-5 shadow-card ring-1 ring-black/[0.03] transition ${
                  on
                    ? "border-halal-200 hover:border-halal-300"
                    : "border-zinc-100 opacity-60"
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    on ? "bg-halal-600 text-white" : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  <Icon />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                  {s.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {s.desc}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-halal-800">
                  {on ? "Available" : s.active === false ? "Not listed" : "Unknown"}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
