import { edgeFetch } from "@/lib/edge-fetch";
import type { StoredNearbyMosque } from "@/types/restaurant";

export type MosquePlace = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  vicinity?: string;
  distanceMeters: number;
  walkingMinutes: number;
};

type NearbySearchResponse = {
  results?: Array<{
    place_id: string;
    name: string;
    geometry?: { location?: { lat: number; lng: number } };
    vicinity?: string;
  }>;
  status: string;
};

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseNearbyMosquesJson(raw: unknown): StoredNearbyMosque[] {
  if (raw == null) return [];
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];

  const out: StoredNearbyMosque[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const lat = row.lat;
    const lng = row.lng;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    out.push({
      name: typeof row.name === "string" ? row.name : null,
      address: typeof row.address === "string" ? row.address : null,
      lat,
      lng,
      distance: typeof row.distance === "number" ? row.distance : 0,
    });
  }
  return out;
}

/**
 * Mosques saved on the restaurant row (no Google API).
 */
export function mosquesFromStoredColumn(
  raw: unknown,
  restaurantLat: number,
  restaurantLng: number,
  max = 8
): MosquePlace[] {
  const stored = parseNearbyMosquesJson(raw);
  const list: MosquePlace[] = [];

  for (let i = 0; i < stored.length; i++) {
    const m = stored[i];
    const dist = haversineMeters(restaurantLat, restaurantLng, m.lat, m.lng);
    list.push({
      placeId: `stored-${i}-${m.lat}-${m.lng}`,
      name: m.name?.trim() || "Mosque",
      latitude: m.lat,
      longitude: m.lng,
      vicinity: m.address ?? undefined,
      distanceMeters: dist,
      walkingMinutes: Math.max(1, Math.round(dist / 80)),
    });
  }

  list.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return list.slice(0, max);
}

/**
 * Prefer DB nearby_mosques; fall back to live Places search when empty.
 */
export async function getMosquesForRestaurant(restaurant: {
  latitude: number | null;
  longitude: number | null;
  nearby_mosques?: unknown;
}): Promise<MosquePlace[]> {
  if (restaurant.latitude == null || restaurant.longitude == null) {
    return [];
  }

  const fromDb = mosquesFromStoredColumn(
    restaurant.nearby_mosques,
    restaurant.latitude,
    restaurant.longitude
  );
  if (fromDb.length > 0) {
    return fromDb;
  }

  return fetchNearbyMosques({
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    radiusMeters: 2000,
  });
}

export async function fetchNearbyMosques(params: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}): Promise<MosquePlace[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];

  const radius = Math.min(params.radiusMeters ?? 2000, 50000);
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
  );
  url.searchParams.set("location", `${params.latitude},${params.longitude}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("type", "mosque");
  url.searchParams.set("key", key);

  const res = await edgeFetch(url.toString());
  if (!res.ok) return [];
  const data = (await res.json()) as NearbySearchResponse;
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];

  const list: MosquePlace[] = [];
  for (const r of data.results ?? []) {
    const lat = r.geometry?.location?.lat;
    const lng = r.geometry?.location?.lng;
    if (lat == null || lng == null) continue;
    const dist = haversineMeters(params.latitude, params.longitude, lat, lng);
    if (dist > radius) continue;
    list.push({
      placeId: r.place_id,
      name: r.name,
      latitude: lat,
      longitude: lng,
      vicinity: r.vicinity,
      distanceMeters: dist,
      walkingMinutes: Math.max(1, Math.round(dist / 80)),
    });
  }
  list.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return list.slice(0, 8);
}

export function googleMapsDirectionsUrl(
  destLat: number,
  destLng: number,
  label?: string
): string {
  const q = label
    ? `${encodeURIComponent(label)}@${destLat},${destLng}`
    : `${destLat},${destLng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}
