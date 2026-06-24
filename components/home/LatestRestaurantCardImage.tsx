"use client";

import Image from "next/image";
import { useState } from "react";
import { getRestaurantInitial } from "@/lib/restaurant-initial";

export function LatestRestaurantCardImage({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !photoUrl?.trim() || failed;
  const initial = getRestaurantInitial(name);

  if (showPlaceholder) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-halal-700 to-halal-950"
        role="img"
        aria-label={`${name} — no photo available`}
      >
        <span className="font-serif text-4xl font-bold text-white/90">
          {initial}
        </span>
      </div>
    );
  }

  const src = photoUrl!.trim();

  return (
    <Image
      src={src}
      alt={name}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover transition duration-500 group-hover:scale-[1.03]"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
