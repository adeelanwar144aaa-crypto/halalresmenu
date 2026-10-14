import Link from "next/link";
import { RestaurantThumbnailStatic } from "@/components/restaurant/RestaurantThumbnailStatic";
import type { CityRestaurant } from "@/lib/city-restaurants";
import {
  cityHubPagePath,
  cityHubTotalPages,
} from "@/lib/city-hub-pagination";
import { firstRestaurantPhotoFromJson } from "@/lib/restaurant-photos";
import { restaurantSubdomainUrl } from "@/lib/utils";

const EAGER_IMAGE_COUNT = 0;

export function CityPaginatedRestaurants({
  cityPath,
  cityName,
  restaurants,
  total,
  page,
}: {
  cityPath: string;
  cityName: string;
  restaurants: CityRestaurant[];
  total: number;
  page: number;
}) {
  const totalPages = cityHubTotalPages(total);

  return (
    <>
      <div className="rounded-xl border border-halal-100 bg-halal-50/50 px-4 py-3">
        <p className="text-sm font-medium text-halal-800">
          Showing{" "}
          <span className="font-bold text-halal-900">
            {restaurants.length.toLocaleString()}
          </span>{" "}
          of {total.toLocaleString()} restaurants
          {totalPages > 1 ? (
            <>
              {" "}
              · page {page} of {totalPages}
            </>
          ) : null}
        </p>
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        {restaurants.map((restaurant, index) => {
          const photoUrl = firstRestaurantPhotoFromJson(restaurant.photos);
          const eager = index < EAGER_IMAGE_COUNT;
          return (
            <li key={restaurant.slug}>
              <Link
                href={restaurantSubdomainUrl(restaurant.slug)}
                className="flex gap-4 rounded-2xl border border-halal-100 bg-white p-4 shadow-card transition hover:border-halal-300 hover:shadow-card-hover sm:p-5"
              >
                <RestaurantThumbnailStatic
                  name={restaurant.name}
                  city={restaurant.city ?? cityName}
                  photoUrl={photoUrl}
                  loading={eager ? "eager" : "lazy"}
                  sizes="(max-width: 768px) 25vw, 96px"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-halal-950">
                    {restaurant.name}
                  </span>
                  {[restaurant.cuisine_type, restaurant.city]
                    .filter(Boolean)
                    .join(" · ") ? (
                    <span className="mt-1 block text-sm text-halal-700/75">
                      {[restaurant.cuisine_type, restaurant.city]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 ? (
        <nav
          className="mt-10 flex flex-wrap items-center justify-center gap-2"
          aria-label="Restaurant list pagination"
        >
          {page > 1 ? (
            <Link
              href={cityHubPagePath(cityPath, page - 1)}
              className="rounded-xl border border-halal-200 bg-white px-4 py-2 text-sm font-semibold text-halal-800 hover:bg-halal-50"
              rel="prev"
            >
              Previous
            </Link>
          ) : null}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              if (totalPages <= 7) return true;
              if (p === 1 || p === totalPages) return true;
              return Math.abs(p - page) <= 1;
            })
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              const showEllipsis = prev != null && p - prev > 1;
              return (
                <span key={p} className="flex items-center gap-2">
                  {showEllipsis ? (
                    <span className="px-1 text-halal-500">…</span>
                  ) : null}
                  {p === page ? (
                    <span
                      className="rounded-xl bg-halal-600 px-4 py-2 text-sm font-semibold text-white"
                      aria-current="page"
                    >
                      {p}
                    </span>
                  ) : (
                    <Link
                      href={cityHubPagePath(cityPath, p)}
                      className="rounded-xl border border-halal-200 bg-white px-4 py-2 text-sm font-semibold text-halal-800 hover:bg-halal-50"
                    >
                      {p}
                    </Link>
                  )}
                </span>
              );
            })}
          {page < totalPages ? (
            <Link
              href={cityHubPagePath(cityPath, page + 1)}
              className="rounded-xl border border-halal-200 bg-white px-4 py-2 text-sm font-semibold text-halal-800 hover:bg-halal-50"
              rel="next"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
