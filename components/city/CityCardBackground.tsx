"use client";

import Image from "next/image";
import { useState } from "react";
import {
  DEFAULT_CITY_IMAGE,
  getCityImagePath,
  isRemoteCityImage,
} from "@/lib/cityImages";

export function CityCardBackground({
  slug,
  alt,
  imageSrc,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: {
  slug: string;
  alt: string;
  imageSrc?: string;
  sizes?: string;
}) {
  const initialSrc = imageSrc?.trim() || getCityImagePath(slug);
  const [src, setSrc] = useState(initialSrc);
  const remote = isRemoteCityImage(src);

  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover transition duration-500 group-hover:scale-105"
        loading="lazy"
        unoptimized={remote}
        onError={() => {
          if (src !== DEFAULT_CITY_IMAGE) {
            setSrc(DEFAULT_CITY_IMAGE);
          }
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-halal-950/75 via-halal-900/65 to-halal-950/85"
        aria-hidden
      />
    </>
  );
}
