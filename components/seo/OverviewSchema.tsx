import type { MenuDataItem, Restaurant, Review } from "@/types/restaurant";
import { SchemaMarkup } from "@/components/seo/SchemaMarkup";

type Breadcrumb = { name: string; url: string };

/** Overview page JSON-LD — delegates to SchemaMarkup with reviews, menu, and FAQ. */
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
  return (
    <SchemaMarkup
      restaurant={restaurant}
      url={url}
      breadcrumbs={breadcrumbs}
      reviews={reviews}
      menuSample={menuSample}
      includeFaq
    />
  );
}
