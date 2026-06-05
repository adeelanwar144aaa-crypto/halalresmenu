import type { MenuDataItem, Restaurant, Review } from "@/types/restaurant";

type Breadcrumb = { name: string; url: string };

export function OverviewSchema({
  restaurant,
  url,
  breadcrumbs,
  reviews,
  menuSample,
}: {
  restaurant: Restaurant;
  url: string;
  breadcrumbs: Breadcrumb[];
  reviews: Review[];
  menuSample: MenuDataItem[];
}) {
  const sameAs = [restaurant.website].filter(Boolean) as string[];
  const ratings = reviews
    .map((r) => r.rating)
    .filter((n): n is number => n != null && !Number.isNaN(n));
  const avg =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : undefined;

  const restaurantJson = {
    "@context": "https://schema.org",
    "@type": ["Restaurant", "FoodEstablishment", "LocalBusiness"],
    "@id": url,
    name: restaurant.name,
    url,
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
    aggregateRating:
      avg != null
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(avg.toFixed(2)),
            reviewCount: ratings.length,
          }
        : undefined,
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

  const menuListJson =
    menuSample.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Menu highlights — ${restaurant.name}`,
          itemListElement: menuSample.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "MenuItem",
              name: item.name,
              description: item.description ?? undefined,
              offers: item.price
                ? {
                    "@type": "Offer",
                    price: item.price,
                    priceCurrency: "GBP",
                  }
                : undefined,
            },
          })),
        }
      : null;

  const reviewItems = reviews.slice(0, 8).map((r) => ({
    "@type": "Review",
    author: r.author_name ?? "Guest",
    datePublished: r.date ?? undefined,
    reviewBody: r.content ?? undefined,
    reviewRating: r.rating
      ? {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating: 5,
        }
      : undefined,
  }));

  const reviewJson =
    reviewItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "Restaurant",
          "@id": `${url}#reviews`,
          name: restaurant.name,
          review: reviewItems,
        }
      : null;

  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${restaurant.name} halal certified?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `This listing records a halal status of ${String(restaurant.halal_status ?? "unknown")}. Always confirm with the restaurant before visiting.`,
        },
      },
      {
        "@type": "Question",
        name: `Does ${restaurant.name} serve alcohol?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            restaurant.alcohol_on_premises === null
              ? "Alcohol policy is not listed. Call the venue to confirm."
              : restaurant.alcohol_on_premises
                ? "The listing indicates alcohol may be served on the premises. Confirm with the venue."
                : "The listing indicates alcohol is not served on the premises. Confirm with the venue.",
        },
      },
    ],
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
      {menuListJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(menuListJson) }}
        />
      )}
      {reviewJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJson) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }}
      />
    </>
  );
}
