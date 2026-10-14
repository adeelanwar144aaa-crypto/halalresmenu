import { restaurantPhotoPlaceholder } from "@/lib/restaurant-placeholders";
import { SectionHeading } from "@/components/restaurant/SectionHeading";

const MAX_PHOTOS = 10;

function photoAltText(
  restaurantName: string,
  city: string | null | undefined,
  index: number
): string {
  const place = city?.trim()
    ? `${restaurantName} in ${city.trim()}`
    : restaurantName;
  return `${place} – photo ${index + 1}`;
}

/** Server-rendered gallery — lazy images, no client slider JS on overview LCP path. */
export function PhotoGallery({
  photoUrls,
  slug,
  restaurantName,
  city,
}: {
  photoUrls: string[];
  slug: string;
  restaurantName: string;
  city?: string | null;
}) {
  if (photoUrls.length === 0) return null;

  const photos = photoUrls.slice(0, MAX_PHOTOS);

  return (
    <section className="border-b border-zinc-100/80 bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Photos"
          subtitle={`${photos.length} photo${photos.length === 1 ? "" : "s"} from this listing.`}
        />
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {photos.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={photoAltText(restaurantName, city, index)}
                width={400}
                height={300}
                loading="lazy"
                decoding="async"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PhotoGalleryPlaceholder({
  slug,
  restaurantName,
}: {
  slug: string;
  restaurantName: string;
}) {
  return (
    <section className="border-b border-zinc-100/80 bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Photos"
          subtitle="No photos available for this listing yet."
        />
        <figure className="mt-8 max-w-lg overflow-hidden rounded-2xl bg-zinc-100 shadow-card ring-1 ring-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={restaurantPhotoPlaceholder(slug, 0)}
            alt={`${restaurantName} — placeholder`}
            className="aspect-[4/3] w-full object-cover"
          />
        </figure>
      </div>
    </section>
  );
}
