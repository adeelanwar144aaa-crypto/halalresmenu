"use client";

import { useMemo, useState } from "react";
import { CityRestaurantCard } from "@/components/city/CityRestaurantCard";
import type { CityRestaurantBrowse } from "@/lib/city-restaurants";
import {
  EMPTY_CITY_FILTERS,
  applyCityFilters,
  buildCityFilterOptions,
  countActiveCityFilters,
  toggleFilterValue,
  type CityFilterOptions,
  type CityFilterState,
} from "@/lib/city-filters";

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-halal-200/60 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-halal-700">
        {title}
      </h3>
      <div className="mt-2.5 space-y-1">{children}</div>
    </div>
  );
}

function CheckboxRow({
  id,
  label,
  count,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition ${
        checked
          ? "bg-halal-100/90 font-medium text-halal-900 ring-1 ring-halal-200/80"
          : "text-halal-900/85 hover:bg-halal-50"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-halal-300 text-halal-600 focus:ring-halal-500 focus:ring-offset-0"
      />
      <span className="min-w-0 flex-1 leading-snug">
        {label}
        {count != null ? (
          <span className="ml-1 font-normal text-halal-600/70">({count})</span>
        ) : null}
      </span>
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl border border-halal-200 bg-white px-3 py-2.5 text-sm text-halal-950 placeholder:text-halal-600/45 focus:border-halal-500 focus:outline-none focus:ring-2 focus:ring-halal-500/20";

function CityFiltersSidebar({
  filters,
  options,
  onChange,
  onReset,
  activeCount,
  cityName,
  className = "",
}: {
  filters: CityFilterState;
  options: CityFilterOptions;
  onChange: (next: CityFilterState) => void;
  onReset: () => void;
  activeCount: number;
  cityName: string;
  className?: string;
}) {
  return (
    <div
      className={`flex max-h-[min(70vh,calc(100vh-7rem))] flex-col overflow-hidden rounded-2xl border border-halal-200/90 bg-gradient-to-b from-halal-50 via-white to-halal-50/80 shadow-[0_8px_30px_-12px_rgb(26_122_74_/_0.35)] lg:max-h-[calc(100vh-7rem)] ${className}`}
    >
      <div className="shrink-0 border-b border-halal-200/70 bg-halal-600 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold">Filters</h2>
            <p className="mt-0.5 text-sm text-halal-100/90">
              Refine halal restaurants in {cityName}
            </p>
          </div>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={onReset}
              className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/25"
            >
              Clear ({activeCount})
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-thin sm:px-5">
        <div className="space-y-4">
          <FilterGroup title="Search">
            <input
              type="search"
              value={filters.query}
              onChange={(e) => onChange({ ...filters, query: e.target.value })}
              placeholder="Restaurant name…"
              className={inputClassName}
            />
          </FilterGroup>

          <FilterGroup title="Sort by">
            <select
              value={filters.sort}
              onChange={(e) =>
                onChange({
                  ...filters,
                  sort: e.target.value as CityFilterState["sort"],
                })
              }
              className={inputClassName}
            >
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
              <option value="rating-desc">Highest rated</option>
            </select>
          </FilterGroup>

          {options.cuisines.length > 0 ? (
            <FilterGroup title="Cuisine">
              {options.cuisines.map((item) => (
                <CheckboxRow
                  key={item.value}
                  id={`cuisine-${item.value}`}
                  label={item.value}
                  count={item.count}
                  checked={filters.cuisines.includes(item.value)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      cuisines: toggleFilterValue(filters.cuisines, item.value),
                    })
                  }
                />
              ))}
            </FilterGroup>
          ) : null}

          {options.halalStatuses.length > 0 ? (
            <FilterGroup title="Halal status">
              {options.halalStatuses.map((item) => (
                <CheckboxRow
                  key={item.value}
                  id={`halal-${item.value}`}
                  label={item.label}
                  count={item.count}
                  checked={filters.halalStatuses.includes(item.value)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      halalStatuses: toggleFilterValue(
                        filters.halalStatuses,
                        item.value
                      ),
                    })
                  }
                />
              ))}
            </FilterGroup>
          ) : null}

          {options.priceRanges.length > 0 ? (
            <FilterGroup title="Price range">
              {options.priceRanges.map((item) => (
                <CheckboxRow
                  key={item.value}
                  id={`price-${item.value}`}
                  label={item.value}
                  count={item.count}
                  checked={filters.priceRanges.includes(item.value)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      priceRanges: toggleFilterValue(
                        filters.priceRanges,
                        item.value
                      ),
                    })
                  }
                />
              ))}
            </FilterGroup>
          ) : null}

          {options.areas.length > 0 ? (
            <FilterGroup title="Area / town">
              {options.areas.map((item) => (
                <CheckboxRow
                  key={item.value}
                  id={`area-${item.value}`}
                  label={item.value}
                  count={item.count}
                  checked={filters.areas.includes(item.value)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      areas: toggleFilterValue(filters.areas, item.value),
                    })
                  }
                />
              ))}
            </FilterGroup>
          ) : null}

          <FilterGroup title="Dining options">
            <CheckboxRow
              id="filter-dine-in"
              label="Dine-in"
              checked={filters.dineIn}
              onChange={() => onChange({ ...filters, dineIn: !filters.dineIn })}
            />
            <CheckboxRow
              id="filter-takeaway"
              label="Takeaway"
              checked={filters.takeaway}
              onChange={() =>
                onChange({ ...filters, takeaway: !filters.takeaway })
              }
            />
            <CheckboxRow
              id="filter-delivery"
              label="Delivery"
              checked={filters.delivery}
              onChange={() =>
                onChange({ ...filters, delivery: !filters.delivery })
              }
            />
            <CheckboxRow
              id="filter-reservations"
              label="Reservations"
              checked={filters.reservations}
              onChange={() =>
                onChange({ ...filters, reservations: !filters.reservations })
              }
            />
            <CheckboxRow
              id="filter-catering"
              label="Catering"
              checked={filters.catering}
              onChange={() =>
                onChange({ ...filters, catering: !filters.catering })
              }
            />
          </FilterGroup>

          <FilterGroup title="Features">
            <CheckboxRow
              id="filter-family"
              label="Family friendly"
              checked={filters.familyFriendly}
              onChange={() =>
                onChange({ ...filters, familyFriendly: !filters.familyFriendly })
              }
            />
            <CheckboxRow
              id="filter-prayer"
              label="Prayer space"
              checked={filters.prayerSpace}
              onChange={() =>
                onChange({ ...filters, prayerSpace: !filters.prayerSpace })
              }
            />
            <CheckboxRow
              id="filter-muslim-owned"
              label="Muslim owned"
              checked={filters.muslimOwned}
              onChange={() =>
                onChange({ ...filters, muslimOwned: !filters.muslimOwned })
              }
            />
            <CheckboxRow
              id="filter-pork-free"
              label="Pork free"
              checked={filters.porkFree}
              onChange={() =>
                onChange({ ...filters, porkFree: !filters.porkFree })
              }
            />
            <CheckboxRow
              id="filter-no-alcohol"
              label="No alcohol"
              checked={filters.noAlcohol}
              onChange={() =>
                onChange({ ...filters, noAlcohol: !filters.noAlcohol })
              }
            />
          </FilterGroup>

          <FilterGroup title="Minimum rating">
            <select
              value={filters.minRating ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minRating: e.target.value ? Number(e.target.value) : null,
                })
              }
              className={inputClassName}
            >
              <option value="">Any rating</option>
              <option value="3">3.0+ stars</option>
              <option value="3.5">3.5+ stars</option>
              <option value="4">4.0+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>
          </FilterGroup>
        </div>
      </div>
    </div>
  );
}

export function CityRestaurantBrowseSection({
  cityName,
  restaurants,
}: {
  cityName: string;
  restaurants: CityRestaurantBrowse[];
}) {
  const [filters, setFilters] = useState<CityFilterState>(EMPTY_CITY_FILTERS);
  const [mobileOpen, setMobileOpen] = useState(false);

  const options = useMemo(
    () => buildCityFilterOptions(restaurants),
    [restaurants]
  );

  const filtered = useMemo(
    () => applyCityFilters(restaurants, filters),
    [restaurants, filters]
  );

  const activeCount = countActiveCityFilters(filters);

  return (
    <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-2xl border border-halal-300 bg-gradient-to-r from-halal-600 to-halal-700 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgb(26_122_74_/_0.55)]"
          >
            <span>Filters{activeCount > 0 ? ` (${activeCount})` : ""}</span>
            <span aria-hidden className="text-halal-100">
              {mobileOpen ? "−" : "+"}
            </span>
          </button>
          {mobileOpen ? (
            <div className="mt-4">
              <CityFiltersSidebar
                filters={filters}
                options={options}
                onChange={setFilters}
                onReset={() => setFilters(EMPTY_CITY_FILTERS)}
                activeCount={activeCount}
                cityName={cityName}
              />
            </div>
          ) : null}
        </div>

        <div className="hidden lg:block">
          <CityFiltersSidebar
            filters={filters}
            options={options}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_CITY_FILTERS)}
            activeCount={activeCount}
            cityName={cityName}
          />
        </div>
      </aside>

      <div className="min-w-0">
        <div className="rounded-xl border border-halal-100 bg-halal-50/50 px-4 py-3">
          <p className="text-sm font-medium text-halal-800">
            Showing{" "}
            <span className="font-bold text-halal-900">
              {filtered.length.toLocaleString()}
            </span>{" "}
            of {restaurants.length.toLocaleString()} restaurants
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-halal-200 bg-halal-50/40 p-10 text-center">
            <p className="font-medium text-halal-900">No restaurants match</p>
            <p className="mt-2 text-sm text-halal-700/80">
              Try clearing filters or broadening your search.
            </p>
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_CITY_FILTERS)}
                className="mt-4 rounded-xl bg-halal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-halal-700"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {filtered.map((restaurant) => (
              <CityRestaurantCard key={restaurant.slug} restaurant={restaurant} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
