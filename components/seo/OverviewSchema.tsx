import type { MenuDataItem, Restaurant, Review } from "@/types/restaurant";
import { SchemaMarkup } from "@/components/seo/SchemaMarkup";

/** Overview page JSON-LD — reviews and menu highlights when shown on the page. */
export function OverviewSchema({
  restaurant,
  url,
  reviews,
  menuSample,
}: {
  restaurant: Restaurant;
  url: string;
  reviews: Review[];
  menuSample: MenuDataItem[];
}) {
  return (
    <SchemaMarkup
      restaurant={restaurant}
      url={url}
      reviews={reviews}
      menuSample={menuSample}
    />
  );
}
