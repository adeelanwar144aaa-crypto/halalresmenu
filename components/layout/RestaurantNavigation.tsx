"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  page: "overview" | "menu" | "halal-info" | "anchor";
};

function navItems(slug: string): NavItem[] {
  const base = `/${slug}`;
  return [
    { href: `${base}#overview`, label: "Overview", page: "overview" },
    { href: `${base}/menu`, label: "Menu", page: "menu" },
    { href: `${base}/halal-info`, label: "Halal Info", page: "halal-info" },
    { href: `${base}#reviews`, label: "Reviews", page: "anchor" },
    { href: `${base}#prayer-times`, label: "Prayer Times", page: "anchor" },
    { href: `${base}#nearby-mosques`, label: "Nearby Mosques", page: "anchor" },
    { href: `${base}#location`, label: "Location", page: "anchor" },
  ];
}

function isNavItemActive(
  item: NavItem,
  normalizedPath: string,
  slug: string
): boolean {
  const base = `/${slug}`;
  if (item.page === "menu") return normalizedPath === `${base}/menu`;
  if (item.page === "halal-info") return normalizedPath === `${base}/halal-info`;
  if (item.page === "overview") {
    return normalizedPath === base;
  }
  return false;
}

export function RestaurantNavigation({
  slug,
  restaurantName,
}: {
  slug: string;
  restaurantName: string;
}) {
  const pathname = usePathname() ?? "";
  const normalized = pathname.replace(/\/$/, "") || "/";
  const items = navItems(slug);

  return (
    <header className="sticky top-0 z-50 border-b border-halal-100/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[3.5rem] flex-wrap items-center justify-between gap-3 py-3 lg:flex-nowrap lg:gap-6">
          <div className="min-w-0 flex-1 lg:max-w-xs lg:flex-none">
            <p className="truncate text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
              {restaurantName}
            </p>
            <p className="truncate text-xs text-zinc-500">
              Halal listing · {slug.replace(/-/g, " ")}
            </p>
          </div>

          <nav
            className="scrollbar-thin flex w-full items-center gap-1 overflow-x-auto pb-0.5 lg:w-auto lg:justify-end"
            aria-label="Restaurant navigation"
          >
            {items.map((item) => {
              const active = isNavItemActive(item, normalized, slug);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-halal-600 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-halal-50 hover:text-halal-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
