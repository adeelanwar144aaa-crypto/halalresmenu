import Link from "next/link";
import type { MenuData, Restaurant } from "@/types/restaurant";
import {
  formatMenuPrice,
  getMenuHighlights,
  hasMenuData,
} from "@/lib/menu-data";
import { restaurantSubdomainUrl } from "@/lib/utils";

export function MenuHighlights({
  restaurant,
  menuData,
}: {
  restaurant: Restaurant;
  menuData: MenuData | null;
}) {
  if (!hasMenuData(menuData)) return null;

  const highlights = getMenuHighlights(menuData, 3);
  const byCategory = new Map<string, typeof highlights>();
  for (const entry of highlights) {
    const list = byCategory.get(entry.categoryName) ?? [];
    list.push(entry);
    byCategory.set(entry.categoryName, list);
  }

  return (
    <section
      id="menu-highlights"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-white py-14 sm:scroll-mt-36 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
              Menu
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Menu highlights
            </h2>
            <p className="mt-3 max-w-xl text-lg text-zinc-600">
              A curated snapshot from each category — open the full menu for
              every dish.
            </p>
          </div>
          <Link
            href={restaurantSubdomainUrl(restaurant.slug, "/menu")}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-halal-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-halal-600/20 transition hover:bg-halal-700"
          >
            View full menu
          </Link>
        </div>

        <div className="mt-10 space-y-10">
          {[...byCategory.entries()].map(([categoryName, items]) => (
            <div key={categoryName}>
              <h3 className="text-lg font-semibold text-zinc-900">
                {categoryName}
              </h3>
              <ul className="mt-4 divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-white px-4 sm:px-6">
                {items.map((item) => {
                  const priceLabel = formatMenuPrice(item.price);
                  return (
                    <li
                      key={item.key}
                      className="flex items-start justify-between gap-4 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-zinc-900">{item.name}</p>
                        {item.description ? (
                          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      {priceLabel ? (
                        <p className="shrink-0 text-right text-sm font-semibold text-emerald-600">
                          {priceLabel}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
