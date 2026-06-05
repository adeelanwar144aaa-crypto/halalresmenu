import { averageReviewRating } from "@/lib/review-aggregate";
import type { Restaurant } from "@/types/restaurant";

export type GooglePlaceReview = {
  author_name: string | null;
  rating: number | null;
  text: string | null;
  time: number | null;
  profile_photo_url: string | null;
};

const MAX_DISPLAY_REVIEWS = 5;

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeReviewEntry(raw: unknown): GooglePlaceReview | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const ratingRaw = o.rating;
  const rating =
    typeof ratingRaw === "number" && Number.isFinite(ratingRaw)
      ? Math.min(5, Math.max(1, ratingRaw))
      : null;

  const timeRaw = o.time;
  let time: number | null = null;
  if (typeof timeRaw === "number" && Number.isFinite(timeRaw)) {
    time = timeRaw > 1e12 ? Math.floor(timeRaw / 1000) : Math.floor(timeRaw);
  }

  const author_name =
    typeof o.author_name === "string" && o.author_name.trim()
      ? o.author_name.trim()
      : null;

  const text =
    typeof o.text === "string" && o.text.trim() ? o.text.trim() : null;

  const profile_photo_url =
    typeof o.profile_photo_url === "string" &&
    o.profile_photo_url.trim() &&
    isHttpUrl(o.profile_photo_url.trim())
      ? o.profile_photo_url.trim()
      : null;

  if (!author_name && !text && rating == null) return null;

  return {
    author_name,
    rating,
    text,
    time,
    profile_photo_url,
  };
}

/**
 * Parses restaurants.reviews JSONB (Google Place Details format).
 */
export function parseGoogleReviewsJson(value: unknown): GooglePlaceReview[] {
  if (value == null) return [];

  let raw: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  const out: GooglePlaceReview[] = [];
  for (const item of raw) {
    const review = normalizeReviewEntry(item);
    if (review) out.push(review);
  }
  return out.slice(0, MAX_DISPLAY_REVIEWS);
}

/** Unix seconds → "May 2026" */
export function formatGoogleReviewDate(time: number | null): string | null {
  if (time == null || !Number.isFinite(time)) return null;
  const ms = time > 1e12 ? time : time * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function authorInitials(name: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function resolveRestaurantReviewSummary(
  restaurant: Restaurant,
  tableReviewRatings: Array<{ rating: number | null }> = []
): {
  reviews: GooglePlaceReview[];
  average: number | null;
  count: number;
} {
  const reviews = parseGoogleReviewsJson(restaurant.reviews);
  const fromJson = averageReviewRating(
    reviews.map((r) => ({ rating: r.rating }))
  );

  if (fromJson.count > 0) {
    return {
      reviews,
      average: fromJson.average,
      count:
        typeof restaurant.total_reviews === "number" &&
        restaurant.total_reviews > 0
          ? restaurant.total_reviews
          : fromJson.count,
    };
  }

  if (
    typeof restaurant.rating === "number" &&
    typeof restaurant.total_reviews === "number" &&
    restaurant.total_reviews > 0
  ) {
    return {
      reviews,
      average: restaurant.rating,
      count: restaurant.total_reviews,
    };
  }

  const fromTable = averageReviewRating(tableReviewRatings);
  return {
    reviews,
    average: fromTable.average,
    count: fromTable.count,
  };
}
