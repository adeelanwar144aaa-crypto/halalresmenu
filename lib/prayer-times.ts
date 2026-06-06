import { edgeFetch } from "@/lib/edge-fetch";

const ALADHAN_BASE = "https://api.aladhan.com/v1";

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

export async function fetchPrayerTimesForCoordinates(params: {
  latitude: number;
  longitude: number;
  date?: Date;
}): Promise<DailyPrayerTimings | null> {
  const d = params.date ?? new Date();
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const apiKey = process.env.ALADHAN_API_KEY;

  const qs = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
  });
  if (apiKey) qs.set("key", apiKey);

  const url = `${ALADHAN_BASE}/timings/${day}-${month}-${year}?${qs.toString()}`;
  const res = await edgeFetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as AladhanTimingsResponse;
  if (!json.data?.timings) return null;
  const t = json.data.timings;
  return {
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
}

/** Friday Jummah: prefer API field if present, else Dhuhr time as fallback */
export async function fetchJummahTime(params: {
  latitude: number;
  longitude: number;
}): Promise<string | null> {
  const friday = nextFriday(new Date());
  const d = friday.getDate();
  const m = friday.getMonth() + 1;
  const y = friday.getFullYear();
  const apiKey = process.env.ALADHAN_API_KEY;
  const qs = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
  });
  if (apiKey) qs.set("key", apiKey);
  const url = `${ALADHAN_BASE}/timings/${d}-${m}-${y}?${qs.toString()}`;
  const res = await edgeFetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as AladhanTimingsResponse;
  const t = json.data?.timings;
  if (!t) return null;
  return (
    pickTiming(t, ["Jummah", "Jumu'ah", "Jumuah"]) || pickTiming(t, ["Dhuhr"])
  );
}

function nextFriday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay();
  const diff = (5 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}
