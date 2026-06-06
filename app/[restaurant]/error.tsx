"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RestaurantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Restaurant page error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-800">
        Error
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-3 leading-relaxed text-zinc-600">
        We could not load this restaurant page. The listing may still exist —
        try again in a moment.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex rounded-xl bg-halal-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-halal-600/25 transition hover:bg-halal-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
        >
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
