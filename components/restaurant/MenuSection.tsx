import Link from "next/link";
import type { MenuData, Restaurant } from "@/types/restaurant";
import { formatMenuPrice, hasMenuData } from "@/lib/menu-data";
import { SectionHeading } from "@/components/restaurant/SectionHeading";

function MenuItemRow({
  item,
  itemKey,
}: {
  item: { name: string; description: string | null; price: number | null };
  itemKey: string;
}) {
  const priceLabel = formatMenuPrice(item.price);

  return (
    <li
      key={itemKey}
      className="flex items-start justify-between gap-4 border-b border-zinc-100 py-4 last:border-b-0"
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
}

export function MenuSection({
  restaurant,
  menuData,
  preview,
  suppressTitle,
}: {
  restaurant: Restaurant;
  menuData: MenuData | null;
  preview?: boolean;
  suppressTitle?: boolean;
}) {
  const categories = menuData?.categories ?? [];
  const showMenu = hasMenuData(menuData);
  const headingId = preview ? "menu-preview-heading" : "menu-heading";

  return (
    <section
      className="border-b border-zinc-100/80 bg-zinc-50/50 py-12 sm:py-16"
      aria-labelledby={suppressTitle ? undefined : headingId}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {!suppressTitle && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              title={preview ? "Menu preview" : "Menu"}
              subtitle={
                preview
                  ? "A sample of dishes — open the full menu for every category."
                  : `Full menu for ${restaurant.name}.`
              }
            />
            {preview && (
              <Link
                href={`/${restaurant.slug}/menu`}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-halal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-halal-600/20 transition hover:bg-halal-700"
              >
                View full menu
              </Link>
            )}
          </div>
        )}
        {showMenu ? (
          <div className={suppressTitle ? "space-y-10" : "mt-10 space-y-10"}>
            {categories.map((category, catIndex) => {
              const items = preview
                ? category.items.slice(0, 3)
                : category.items;
              if (items.length === 0) return null;

              return (
                <div key={`${catIndex}-${category.name}`}>
                  <h3 className="border-b border-halal-100 pb-2 text-lg font-semibold text-zinc-900">
                    {category.name}
                  </h3>
                  <ul className="mt-2 divide-y divide-zinc-100 rounded-2xl border border-zinc-100/90 bg-white px-4 sm:px-6">
                    {items.map((item, itemIndex) => (
                      <MenuItemRow
                        key={`${catIndex}-${itemIndex}-${item.name}`}
                        item={item}
                        itemKey={`${catIndex}-${itemIndex}-${item.name}`}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
