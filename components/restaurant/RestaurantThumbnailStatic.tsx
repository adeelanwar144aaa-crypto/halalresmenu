import { getRestaurantInitial } from "@/lib/restaurant-initial";

export function RestaurantThumbnailStatic({
  name,
  city,
  photoUrl,
  width = 96,
  height = 96,
  loading = "lazy",
  sizes = "96px",
  className = "h-20 w-20 sm:h-24 sm:w-24",
}: {
  name: string;
  city?: string | null;
  photoUrl: string | null;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  sizes?: string;
  className?: string;
}) {
  const alt = city?.trim()
    ? `${name} in ${city.trim()}`
    : `${name} — halal restaurant`;

  if (!photoUrl?.trim()) {
    const initial = getRestaurantInitial(name);
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-halal-600 to-halal-800 ring-1 ring-halal-700/20 ${className}`}
      >
        <span
          className="flex h-full w-full items-center justify-center text-2xl font-bold text-white sm:text-3xl"
          role="img"
          aria-label={alt}
        >
          {initial}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-halal-50 ring-1 ring-halal-100 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl.trim()}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        sizes={sizes}
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
