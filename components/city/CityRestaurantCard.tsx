import Link from "next/link";
import { RestaurantThumbnail } from "@/components/restaurant/RestaurantThumbnail";
import { firstRestaurantPhotoUrl } from "@/lib/restaurant-photos";
import type { CityRestaurant } from "@/lib/city-restaurants";
import { restaurantSubdomainUrl } from "@/lib/utils";

export function CityRestaurantCard({ restaurant }: { restaurant: CityRestaurant }) {
  const photoUrl = firstRestaurantPhotoUrl(restaurant.photos);

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
          <span className="mt-1 block text-sm text-zinc-500">
            {[restaurant.cuisine_type, restaurant.city].filter(Boolean).join(" · ")}
          </span>
        </div>
      </Link>
    </li>
  );
}
