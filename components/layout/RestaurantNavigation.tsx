"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = (slug: string) =>
  [
    { href: `/${slug}`, label: "Overview" },
    { href: `/${slug}/menu`, label: "Menu" },
    { href: `/${slug}/halal-info`, label: "Halal info" },
  ] as const;

const anchors = (slug: string) =>
  [
    { href: `/${slug}#photos`, label: "Photos" },
    { href: `/${slug}#about`, label: "About" },
    { href: `/${slug}#highlights`, label: "Highlights" },
    { href: `/${slug}#menu-highlights`, label: "Menu" },
    { href: `/${slug}#halal-information`, label: "Halal" },
    { href: `/${slug}#opening-hours`, label: "Hours" },
    { href: `/${slug}#reviews`, label: "Reviews" },
    { href: `/${slug}#location`, label: "Location" },
    { href: `/${slug}#nearby-mosques`, label: "Mosques" },
    { href: `/${slug}#prayer-times`, label: "Prayer" },
    { href: `/${slug}#nearby-halal-restaurants`, label: "Nearby" },
  ] as const;

export function RestaurantNavigation({
  slug,
  restaurantName,
  showAnchors = true,
}: {
  slug: string;
  restaurantName: string;
  showAnchors?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const normalized = pathname.replace(/\/$/, "") || "/";
  const overviewPath = `/${slug}`;
  const onOverview = normalized === overviewPath;

  return (
    <header className="sticky top-0 z-50 border-b border-halal-100/80 bg-white/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[3.5rem] flex-wrap items-center justify-between gap-3 py-3 lg:min-h-0 lg:flex-nowrap lg:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none lg:max-w-md">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
                {restaurantName}
              </p>
              <p className="truncate text-xs text-zinc-500">
                Halal listing · {slug.replace(/-/g, " ")}
              </p>
            </div>
          </div>

          <nav
            className="scrollbar-thin flex w-full items-center gap-1 overflow-x-auto pb-1 lg:w-auto lg:justify-end lg:pb-0"
            aria-label="Restaurant pages"
          >
            {tabs(slug).map((t) => {
              const active = normalized === t.href.replace(/\/$/, "");
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-halal-600 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-halal-50 hover:text-halal-800"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {showAnchors && onOverview && (
          <nav
            className="scrollbar-thin flex gap-1 overflow-x-auto border-t border-zinc-100/80 py-2.5 lg:py-2"
            aria-label="On this page"
          >
            {anchors(slug).map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 transition hover:bg-halal-50 hover:text-halal-800"
              >
                {a.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
