import { CityCardBackground } from "@/components/city/CityCardBackground";

export function CityPageHero({
  cityName,
  citySlug,
  total,
}: {
  cityName: string;
  citySlug: string;
  total: number;
}) {
  return (
    <section className="relative -mx-4 overflow-hidden sm:-mx-6 lg:-mx-8">
      <div className="relative min-h-[220px] sm:min-h-[260px]">
        <CityCardBackground
          slug={citySlug}
          alt={`${cityName} cityscape`}
          sizes="100vw"
        />
        <div className="relative z-10 mx-auto flex min-h-[220px] max-w-7xl flex-col justify-end px-4 pb-8 pt-16 sm:min-h-[260px] sm:px-6 sm:pb-10 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-halal-200">
            Halal dining in {cityName}
          </p>
          <h1 className="mt-3 max-w-4xl font-serif text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Halal Restaurants in {cityName} — Near Me, Menus & Local Favourites
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-halal-100/90 sm:text-lg">
            {total.toLocaleString()} halal restaurant
            {total === 1 ? "" : "s"} in {cityName}. Browse menus, cuisines,
            takeaway, and trusted halal dining options near you.
          </p>
        </div>
      </div>
    </section>
  );
}
