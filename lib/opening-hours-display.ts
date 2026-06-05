import type { OpeningDayHours, OpeningHours } from "@/types/restaurant";

const WEEK_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const WEEK_LABELS: Record<(typeof WEEK_KEYS)[number], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function jsDayToKey(d: Date): (typeof WEEK_KEYS)[number] {
  const map: (typeof WEEK_KEYS)[number][] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return map[d.getDay()];
}

function formatRange(day: OpeningDayHours | undefined): string {
  if (!day || day.closed) return "Closed";
  const o = day.open ? String(day.open) : "";
  const c = day.close ? String(day.close) : "";
  if (!o && !c) return "Hours vary — call ahead";
  if (o && c) return `${o} – ${c}`;
  return o || c || "—";
}

export function formatTodayOpeningLine(
  opening: OpeningHours | Record<string, unknown> | null | undefined,
  now: Date = new Date()
): string {
  if (!opening || typeof opening !== "object") return "Hours not listed";
  const key = jsDayToKey(now);
  const label = WEEK_LABELS[key];
  const day = (opening as OpeningHours)[key];
  return `${label}: ${formatRange(day)}`;
}

export type WeekRow = {
  key: (typeof WEEK_KEYS)[number];
  label: string;
  display: string;
  isToday: boolean;
};

export function getWeekOpeningRows(
  opening: OpeningHours | Record<string, unknown> | null | undefined,
  now: Date = new Date()
): WeekRow[] {
  const todayKey = jsDayToKey(now);
  const oh =
    opening && typeof opening === "object" ? (opening as OpeningHours) : null;
  return WEEK_KEYS.map((key) => ({
    key,
    label: WEEK_LABELS[key],
    display: formatRange(oh?.[key]),
    isToday: key === todayKey,
  }));
}

export function getRamadanRows(
  ramadan: Record<string, unknown> | null | undefined
): WeekRow[] | null {
  if (!ramadan || typeof ramadan !== "object") return null;
  const keys = Object.keys(ramadan);
  if (keys.length === 0) return null;
  return WEEK_KEYS.map((key) => {
    const raw = ramadan[key];
    const day =
      raw && typeof raw === "object"
        ? (raw as OpeningDayHours)
        : undefined;
    return {
      key,
      label: `${WEEK_LABELS[key]} (Ramadan)`,
      display: formatRange(day),
      isToday: false,
    };
  });
}
