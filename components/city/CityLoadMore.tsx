"use client";

import { useState } from "react";
import type { CityRestaurant } from "@/lib/city-restaurants";
import { CITY_PAGE_SIZE } from "@/lib/city-restaurants";
import { CityRestaurantCard } from "@/components/city/CityRestaurantCard";

export function CityLoadMore({
  citySlug,
  initialOffset,
  hasMore: initialHasMore,
}: {
  citySlug: string;
  initialOffset: number;
  hasMore: boolean;
}) {
  const [extra, setExtra] = useState<CityRestaurant[]>([]);
  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!initialHasMore && extra.length === 0) {
    return null;
  }

  async function handleLoadMore() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/city/${encodeURIComponent(citySlug)}/restaurants?offset=${offset}&limit=${CITY_PAGE_SIZE}`
      );
      if (!res.ok) {
        throw new Error("Could not load more restaurants.");
      }
      const json = (await res.json()) as {
        restaurants: CityRestaurant[];
        hasMore: boolean;
      };
      setExtra((prev) => [...prev, ...json.restaurants]);
      setOffset((prev) => prev + json.restaurants.length);
      setHasMore(json.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {extra.map((r) => (
        <CityRestaurantCard key={r.slug} restaurant={r} />
      ))}
      {error ? (
        <li className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </li>
      ) : null}
      {hasMore ? (
        <li className="flex justify-center pt-4">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="inline-flex rounded-xl bg-halal-600 px-8 py-3 text-sm font-semibold text-white shadow-md shadow-halal-600/20 transition hover:bg-halal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </li>
      ) : null}
    </>
  );
}
