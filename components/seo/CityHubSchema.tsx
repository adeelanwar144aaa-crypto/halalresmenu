import type { CityRestaurant } from "@/lib/city-restaurants";
import { cityHubPath } from "@/lib/city-slug";
import { CITY_HUB_PAGE_SIZE } from "@/lib/city-hub-pagination";
import { getApexOrigin } from "@/lib/sitemap-data";
import { restaurantSubdomainUrl } from "@/lib/utils";

export function CityHubSchema({
  cityName,
  citySlug,
  pageUrl,
  restaurants,
  page,
  total,
}: {
  cityName: string;
  citySlug: string;
  pageUrl: string;
  restaurants: CityRestaurant[];
  page: number;
  total: number;
}) {
  const origin = getApexOrigin();
  const cityPath = `${origin}${cityHubPath(citySlug)}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: origin,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: cityName,
            item: cityPath,
          },
        ],
      },
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#collection`,
        url: pageUrl,
        name: `Halal restaurants in ${cityName}`,
        description: `${total.toLocaleString()} halal restaurant listings in ${cityName}.`,
        isPartOf: { "@id": `${origin}/#website` },
        mainEntity: { "@id": `${pageUrl}#itemlist` },
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#itemlist`,
        name: `Halal restaurants in ${cityName}`,
        numberOfItems: total,
        itemListElement: restaurants.map((r, index) => ({
          "@type": "ListItem",
          position: (page - 1) * CITY_HUB_PAGE_SIZE + index + 1,
          name: r.name,
          url: restaurantSubdomainUrl(r.slug),
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
