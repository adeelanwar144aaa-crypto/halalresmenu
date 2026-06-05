"use client";

import { getRestaurantInitial } from "@/lib/restaurant-initial";
import { useState } from "react";

export function RestaurantThumbnail({
  name,
  photoUrl,
  className = "h-20 w-20",
  width = 80,
  height = 80,
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
  width?: number;
  height?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showPlaceholder = !photoUrl?.trim() || imageFailed;
  const initial = getRestaurantInitial(name);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5 ${className} ${
        showPlaceholder ? "bg-halal-600" : "bg-zinc-100"
      }`}
    >
      {showPlaceholder ? (
        <span
          className="flex h-full w-full items-center justify-center text-2xl font-bold text-white sm:text-3xl"
          role="img"
          aria-label={`${name} — no photo`}
        >
          {initial}
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photoUrl ?? ""}
          alt={name}
          width={width}
          height={height}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
}
