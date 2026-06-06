import { normalizeOpeningHours } from "@/lib/opening-hours-display";
import type { OpeningHours } from "@/types/restaurant";

const DAY_ORDER = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function dayKeyFromDate(d: Date): (typeof DAY_ORDER)[number] {
  return DAY_ORDER[d.getDay()];
}

/** Parse "HH:MM" or "H:MM AM" style to minutes since midnight; returns null if unknown */
export function parseTimeToMinutes(t: string): number | null {
  const trimmed = t.trim().toUpperCase();
  const m24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (m24) {
    const h = Number(m24[1]);
    const min = Number(m24[2]);
    if (h >= 0 && h < 24 && min >= 0 && min < 60) return h * 60 + min;
  }
  const m12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(trimmed);
  if (m12) {
    let h = Number(m12[1]);
    const min = Number(m12[2]);
    const ap = m12[3];
    if (h === 12) h = 0;
    if (ap === "PM") h += 12;
    if (h >= 0 && h < 24 && min >= 0 && min < 60) return h * 60 + min;
  }
  return null;
}

function minutesFromAladhanStyle(time: string): number | null {
  const cleaned = time.replace(/\s*\(.*\)\s*$/, "").trim();
  return parseTimeToMinutes(cleaned);
}

/**
 * Heuristic: restaurant is open at prayer time if today's opening_hours has open/close
 * and prayer falls within range. Overnight close (e.g. 2:00) treated as next day.
 */
export function isOpenAtPrayerTime(
  opening: OpeningHours | Record<string, unknown> | string | null | undefined,
  prayerTime: string,
  now: Date = new Date()
): boolean | null {
  const oh = normalizeOpeningHours(opening);
  if (!oh) return null;
  const day = dayKeyFromDate(now);
  const dayHours = oh[day];
  if (!dayHours || dayHours.closed) return false;
  const openStr = dayHours.open;
  const closeStr = dayHours.close;
  if (!openStr || !closeStr) return null;
  const openM = parseTimeToMinutes(String(openStr));
  const closeM = parseTimeToMinutes(String(closeStr));
  const prayM = minutesFromAladhanStyle(prayerTime);
  if (openM == null || closeM == null || prayM == null) return null;
  if (closeM > openM) return prayM >= openM && prayM <= closeM;
  return prayM >= openM || prayM <= closeM;
}

function nowMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Whether the venue is open right now based on `opening_hours` for today's weekday. */
export function isRestaurantOpenNow(
  opening: OpeningHours | Record<string, unknown> | string | null | undefined,
  now: Date = new Date()
): boolean | null {
  const oh = normalizeOpeningHours(opening);
  if (!oh) return null;
  const day = dayKeyFromDate(now);
  const dayHours = oh[day];
  if (!dayHours || dayHours.closed) return false;
  const openStr = dayHours.open;
  const closeStr = dayHours.close;
  if (!openStr || !closeStr) return null;
  const openM = parseTimeToMinutes(String(openStr));
  const closeM = parseTimeToMinutes(String(closeStr));
  if (openM == null || closeM == null) return null;
  const cur = nowMinutes(now);
  if (closeM > openM) return cur >= openM && cur <= closeM;
  return cur >= openM || cur <= closeM;
}
