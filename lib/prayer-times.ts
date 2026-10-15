import { cache } from "react";
import { edgeFetch } from "@/lib/edge-fetch";

const ALADHAN_BASE = "https://api.aladhan.com/v1";

/** Per-isolate cache — prayer timings change daily, not per request. */
const TIMINGS_CACHE_MS = 6 * 3600 * 1000;
const timingsMemory = new Map<string, { exp: number; value: DailyPrayerTimings | null }>();
const jummahMemory = new Map<string, { exp: number; value: string | null }>();

function roundCoord(n: number): string {
  return n.toFixed(3);
}

function readMemory<T>(
  map: Map<string, { exp: number; value: T }>,
  key: string
): T | undefined {
  const hit = map.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.exp) {
    map.delete(key);
    return undefined;
  }
  return hit.value;
}

function writeMemory<T>(
  map: Map<string, { exp: number; value: T }>,
  key: string,
  value: T
): void {
  map.set(key, { exp: Date.now() + TIMINGS_CACHE_MS, value });
}

export type DailyPrayerTimings = {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  timezone?: string;
  dateReadable?: string;
  gregorianDate?: string;
};

export type AladhanTimingsResponse = {
  code: number;
  status: string;
  data?: {
    timings: Record<string, string>;
    date: { readable?: string; gregorian?: { date?: string } };
    meta?: { timezone?: string };
  };
};

function pickTiming(timings: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = timings[k];
    if (v) return v;
  }
  return "";
}

async function fetchPrayerTimesForCoordinatesImpl(
  latitude: number,
  longitude: number,
  day: number,
  month: number,
  year: number
): Promise<DailyPrayerTimings | null> {
  const memKey = `${roundCoord(latitude)}:${roundCoord(longitude)}:${year}-${month}-${day}`;
  const cached = readMemory(timingsMemory, memKey);
  if (cached !== undefined) return cached;

  const apiKey = process.env.ALADHAN_API_KEY;
  const qs = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  });
  if (apiKey) qs.set("key", apiKey);

  const url = `${ALADHAN_BASE}/timings/${day}-${month}-${year}?${qs.toString()}`;
  const res = await edgeFetch(url);
  if (!res.ok) {
    writeMemory(timingsMemory, memKey, null);
    return null;
  }
  const json = (await res.json()) as AladhanTimingsResponse;
  if (!json.data?.timings) {
    writeMemory(timingsMemory, memKey, null);
    return null;
  }
  const t = json.data.timings;
  const value: DailyPrayerTimings = {
    fajr: pickTiming(t, ["Fajr"]),
    sunrise: pickTiming(t, ["Sunrise"]),
    dhuhr: pickTiming(t, ["Dhuhr"]),
    asr: pickTiming(t, ["Asr"]),
    maghrib: pickTiming(t, ["Maghrib"]),
    isha: pickTiming(t, ["Isha", "Isha'a"]),
    timezone: json.data.meta?.timezone,
    dateReadable: json.data.date?.readable,
    gregorianDate: json.data.date?.gregorian?.date,
  };
  writeMemory(timingsMemory, memKey, value);
  return value;
}

export const fetchPrayerTimesForCoordinates = cache(
  async (params: {
    latitude: number;
    longitude: number;
    date?: Date;
  }): Promise<DailyPrayerTimings | null> => {
    const d = params.date ?? new Date();
    return fetchPrayerTimesForCoordinatesImpl(
      params.latitude,
      params.longitude,
      d.getDate(),
      d.getMonth() + 1,
      d.getFullYear()
    );
  }
);

/** Friday Jummah: prefer API field if present, else Dhuhr time as fallback */
async function fetchJummahTimeImpl(
  latitude: number,
  longitude: number,
  day: number,
  month: number,
  year: number
): Promise<string | null> {
  const memKey = `${roundCoord(latitude)}:${roundCoord(longitude)}:jummah:${year}-${month}-${day}`;
  const cached = readMemory(jummahMemory, memKey);
  if (cached !== undefined) return cached;

  const apiKey = process.env.ALADHAN_API_KEY;
  const qs = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  });
  if (apiKey) qs.set("key", apiKey);
  const url = `${ALADHAN_BASE}/timings/${day}-${month}-${year}?${qs.toString()}`;
  const res = await edgeFetch(url);
  if (!res.ok) {
    writeMemory(jummahMemory, memKey, null);
    return null;
  }
  const json = (await res.json()) as AladhanTimingsResponse;
  const t = json.data?.timings;
  if (!t) {
    writeMemory(jummahMemory, memKey, null);
    return null;
  }
  const value =
    pickTiming(t, ["Jummah", "Jumu'ah", "Jumuah"]) || pickTiming(t, ["Dhuhr"]);
  writeMemory(jummahMemory, memKey, value);
  return value;
}

export const fetchJummahTime = cache(
  async (params: {
    latitude: number;
    longitude: number;
  }): Promise<string | null> => {
    const friday = nextFriday(new Date());
    return fetchJummahTimeImpl(
      params.latitude,
      params.longitude,
      friday.getDate(),
      friday.getMonth() + 1,
      friday.getFullYear()
    );
  }
);

function nextFriday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay();
  const diff = (5 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}
