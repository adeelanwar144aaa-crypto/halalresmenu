import { parseJsonField } from "@/lib/parse-json-field";
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

export function normalizeOpeningHours(
  opening: OpeningHours | Record<string, unknown> | string | null | undefined
): OpeningHours | null {
  if (opening == null) return null;
  if (typeof opening === "string") {
    return parseJsonField<OpeningHours>(opening);
  }
  if (typeof opening === "object") {
    return opening as OpeningHours;
  }
  return null;
}

export function getWeekOpeningRows(
  opening: OpeningHours | Record<string, unknown> | string | null | undefined,
  now: Date = new Date()
): WeekRow[] {
  const todayKey = jsDayToKey(now);
  const oh = normalizeOpeningHours(opening);
  return WEEK_KEYS.map((key) => ({
    key,
    label: WEEK_LABELS[key],
    display: formatRange(oh?.[key]),
    isToday: key === todayKey,
  }));
}

export function getRamadanRows(
  ramadan: Record<string, unknown> | string | null | undefined
): WeekRow[] | null {
  const parsed =
    typeof ramadan === "string"
      ? parseJsonField<Record<string, unknown>>(ramadan)
      : ramadan && typeof ramadan === "object"
        ? ramadan
        : null;
  if (!parsed) return null;
  const ramadanObj = parsed;
  const keys = Object.keys(ramadanObj);
  if (keys.length === 0) return null;
  return WEEK_KEYS.map((key) => {
    const raw = ramadanObj[key];
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
