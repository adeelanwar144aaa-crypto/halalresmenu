import { restaurantPhotoPlaceholder } from "@/lib/restaurant-placeholders";
import { SectionHeading } from "@/components/restaurant/SectionHeading";
import { PhotoGallerySlider } from "@/components/restaurant/PhotoGallerySlider";

export function PhotoGallery({
  photoUrls,
  slug,
  restaurantName,
}: {
  photoUrls: string[];
  slug: string;
  restaurantName: string;
}) {
  if (photoUrls.length === 0) return null;

  return (
    <PhotoGallerySlider
      photoUrls={photoUrls}
      restaurantName={restaurantName}
    />
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
