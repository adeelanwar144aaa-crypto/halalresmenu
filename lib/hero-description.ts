import type { Restaurant } from "@/types/restaurant";

const MAX_SNIPPET_LEN = 240;

/**
 * 1–2 line hero blurb from restaurants.description (or a short fallback).
 */
export function heroDescriptionSnippet(restaurant: Restaurant): string | null {
  const raw = restaurant.description?.trim();
  if (raw) {
    const normalized = raw.replace(/\s+/g, " ");
    const sentenceMatches = normalized.match(/[^.!?]+[.!?]+/g);
    let snippet = sentenceMatches
      ? sentenceMatches.slice(0, 2).join(" ").trim()
      : normalized;

    if (snippet.length > MAX_SNIPPET_LEN) {
      const cut = snippet.slice(0, MAX_SNIPPET_LEN);
      const lastSpace = cut.lastIndexOf(" ");
      snippet =
        (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim() + "…";
    }
    return snippet;
  }

  const city = restaurant.city?.trim();
  const cuisine = restaurant.cuisine_type?.trim();
  if (!city && !cuisine) return null;

  if (cuisine && city) {
    return `${restaurant.name} serves ${cuisine} in ${city} — a halal-friendly spot for dine-in and takeaway.`;
  }
  if (city) {
    return `${restaurant.name} in ${city} — discover halal dining, hours, and contact details below.`;
  }
  return `${restaurant.name} — ${cuisine} with halal-conscious options for local diners.`;
}
