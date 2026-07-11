"use client";

import { getRestaurantInitial } from "@/lib/restaurant-initial";
import { restaurantPhotoUrlVariants } from "@/lib/restaurant-photos";
import { useEffect, useMemo, useState } from "react";

function ThumbnailPlaceholder({
  name,
  className,
}: {
  name: string;
  className: string;
}) {
  const initial = getRestaurantInitial(name);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-halal-600 to-halal-800 ring-1 ring-halal-700/20 ${className}`}
    >
      <span
        className="flex h-full w-full items-center justify-center text-2xl font-bold text-white sm:text-3xl"
        role="img"
        aria-label={`${name} — no photo`}
      >
        {initial}
      </span>
    </div>
  );
}

export function RestaurantThumbnail({
  name,
  photoUrl,
  photoCandidates,
  slug,
  className = "h-20 w-20",
  width = 80,
  height = 80,
}: {
  name: string;
  photoUrl?: string | null;
  photoCandidates?: string[];
  slug?: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  const candidates = useMemo(() => {
    if (photoCandidates?.length) return photoCandidates;
    if (photoUrl?.trim()) {
      return restaurantPhotoUrlVariants(photoUrl.trim(), slug);
    }
    if (slug) return restaurantPhotoUrlVariants("", slug);
    return [];
  }, [photoCandidates, photoUrl, slug]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setExhausted(false);
  }, [candidates]);

  const activeUrl =
    !exhausted && candidates.length > 0
      ? candidates[Math.min(candidateIndex, candidates.length - 1)]
      : null;

  if (!activeUrl) {
    return <ThumbnailPlaceholder name={name} className={className} />;
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-halal-50 ring-1 ring-halal-100 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={activeUrl}
        src={activeUrl}
        alt=""
        aria-hidden
        width={width}
        height={height}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (candidateIndex + 1 >= candidates.length) {
            setExhausted(true);
            return;
          }
          setCandidateIndex((index) => index + 1);
        }}
      />
    </div>
  );
}
