"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HomeHeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"restaurant" | "city">("city");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const param = mode === "city" ? "city" : "q";
    router.push(`/search?${param}=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-10 max-w-2xl rounded-2xl bg-white p-2 shadow-2xl shadow-halal-900/15 ring-1 ring-white/20"
    >
      <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 sm:flex-nowrap">
        <button
          type="button"
          onClick={() => setMode("city")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
            mode === "city"
              ? "bg-white text-halal-800 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          By city
        </button>
        <button
          type="button"
          onClick={() => setMode("restaurant")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
            mode === "restaurant"
              ? "bg-white text-halal-800 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          By name
        </button>
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="home-search">
          {mode === "city" ? "Search by city" : "Search by restaurant name"}
        </label>
        <input
          id="home-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mode === "city"
              ? "e.g. Bradford, Leicester, London…"
              : "e.g. The Great Chase, Lahore Karahi…"
          }
          className="min-w-0 flex-1 rounded-xl border-0 bg-transparent px-4 py-3.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-halal-500/40"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-halal-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-halal-700"
        >
          Search
        </button>
      </div>
    </form>
  );
}
