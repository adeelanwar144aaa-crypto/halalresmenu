"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isRestaurantNavItemActive,
  RESTAURANT_NAV_ITEMS,
  restaurantNavHref,
} from "@/lib/restaurant-nav";

export function RestaurantNavigation({
  slug,
  restaurantName,
  onSubdomain = false,
}: {
  slug: string;
  restaurantName: string;
  /** True when served via restaurant subdomain (middleware sets x-hrm-restaurant-slug). */
  onSubdomain?: boolean;
}) {
  const pathname = usePathname() ?? "";

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
            {RESTAURANT_NAV_ITEMS.map((item) => {
              const href = restaurantNavHref(slug, item.target, onSubdomain);
              const active = isRestaurantNavItemActive(
                item.page,
                pathname,
                slug,
                onSubdomain
              );
              return (
                <Link
                  key={item.target}
                  href={href}
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
