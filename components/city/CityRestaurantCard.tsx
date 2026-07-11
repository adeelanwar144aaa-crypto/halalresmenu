import Link from "next/link";
import { RestaurantThumbnail } from "@/components/restaurant/RestaurantThumbnail";
import { firstRestaurantPhotoUrl } from "@/lib/restaurant-photos";
import type { CityRestaurant, CityRestaurantBrowse } from "@/lib/city-restaurants";
import { restaurantSubdomainUrl } from "@/lib/utils";

export function CityRestaurantCard({
  restaurant,
}: {
  restaurant: CityRestaurant | CityRestaurantBrowse;
}) {
  const photoUrl = firstRestaurantPhotoUrl(restaurant.photos);
  const rating =
    "rating" in restaurant && restaurant.rating != null
      ? Number(restaurant.rating)
      : null;
  const meta = [
    restaurant.cuisine_type,
    restaurant.city,
    rating != null && Number.isFinite(rating) ? `${rating.toFixed(1)}★` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <Link
        href={restaurantSubdomainUrl(restaurant.slug)}
        className="flex gap-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card transition hover:border-halal-200 hover:shadow-card-hover sm:p-5"
      >
        <RestaurantThumbnail
          name={restaurant.name}
          photoUrl={photoUrl}
          className="h-20 w-20 sm:h-24 sm:w-24"
          width={96}
          height={96}
        />
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-zinc-900">{restaurant.name}</span>
          {meta ? (
            <span className="mt-1 block text-sm text-zinc-500">{meta}</span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
