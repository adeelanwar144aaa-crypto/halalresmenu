"use client";

import Image from "next/image";
import { useState } from "react";
import { getCityImagePath } from "@/lib/cityImages";

export function CityCardBackground({
  slug,
  alt,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: {
  slug: string;
  alt: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = failed ? "/images/cities/default.svg" : getCityImagePath(slug);

  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover transition duration-500 group-hover:scale-105"
        loading="lazy"
        onError={() => setFailed(true)}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 to-black/70"
        aria-hidden
      />
    </>
  );
}
