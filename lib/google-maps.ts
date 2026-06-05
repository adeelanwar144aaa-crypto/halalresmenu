import type { Restaurant } from "@/types/restaurant";

/** Google Maps directions deep link for a restaurant. */
export function googleMapsDirectionsUrl(restaurant: Restaurant): string | null {
  const lat = restaurant.latitude;
  const lng = restaurant.longitude;
  if (typeof lat === "number" && typeof lng === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  const destination = [restaurant.address, restaurant.city, restaurant.postcode, restaurant.country]
    .filter(Boolean)
    .join(", ");
  if (destination.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  }

  return null;
}
