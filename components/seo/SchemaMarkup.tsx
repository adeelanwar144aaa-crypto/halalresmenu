import type { Restaurant } from "@/types/restaurant";

type Breadcrumb = { name: string; url: string };

export function SchemaMarkup({
  restaurant,
  url,
  breadcrumbs,
}: {
  restaurant: Restaurant;
  url: string;
  breadcrumbs: Breadcrumb[];
}) {
  const sameAs = [restaurant.website].filter(Boolean) as string[];

  const restaurantJson = {
    "@context": "https://schema.org",
    "@type": ["Restaurant", "FoodEstablishment", "LocalBusiness"],
    "@id": url,
    name: restaurant.name,
    url,
    image: undefined,
    telephone: restaurant.phone ?? undefined,
    email: restaurant.email ?? undefined,
    address: restaurant.address
      ? {
          "@type": "PostalAddress",
          streetAddress: restaurant.address,
          addressLocality: restaurant.city ?? undefined,
          addressCountry: restaurant.country ?? undefined,
        }
      : undefined,
    geo:
      restaurant.latitude != null && restaurant.longitude != null
        ? {
            "@type": "GeoCoordinates",
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
          }
        : undefined,
    servesCuisine: restaurant.cuisine_type ?? undefined,
    priceRange: restaurant.price_range ?? undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };

  const breadcrumbJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.url,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJson) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson) }}
      />
    </>
  );
}
