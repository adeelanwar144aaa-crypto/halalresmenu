import { optimizeCityHeroImageSrc } from "@/lib/city-hero-image";
import { getCityImagePath, isRemoteCityImage } from "@/lib/cityImages";

/** Server-rendered hero image (high priority LCP, no client JS). */
export function CityHeroBackground({
  slug,
  alt,
}: {
  slug: string;
  alt: string;
}) {
  const src = optimizeCityHeroImageSrc(getCityImagePath(slug));
  const remote = isRemoteCityImage(src);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={1600}
        height={640}
        decoding="async"
        fetchPriority="high"
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover"
        sizes="100vw"
        {...(remote ? { referrerPolicy: "no-referrer" as const } : {})}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-halal-950/75 via-halal-900/65 to-halal-950/85"
        aria-hidden
      />
    </>
  );
}
