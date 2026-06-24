import type { CityRestaurant } from "@/lib/city-restaurants";
import { CityRestaurantCard } from "@/components/city/CityRestaurantCard";

export function CityRestaurantList({
  restaurants,
}: {
  restaurants: CityRestaurant[];
}) {
  if (restaurants.length === 0) {
    return (
      <li className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-zinc-600">
        No restaurants found in this city yet.
      </li>
    );
  }

  return (
    <>
      {restaurants.map((r) => (
        <CityRestaurantCard key={r.slug} restaurant={r} />
      ))}
    </>
  );
}
