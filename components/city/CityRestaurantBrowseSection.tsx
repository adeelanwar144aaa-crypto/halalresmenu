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
    <div className="border-t border-zinc-200/80 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </h3>
      <div className="mt-3 space-y-2">{children}</div>
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
      className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm text-zinc-700 transition hover:bg-halal-50/70"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-halal-600 focus:ring-halal-500"
      />
      <span className="flex-1 leading-snug">
        {label}
        {count != null ? (
          <span className="ml-1 text-zinc-400">({count})</span>
        ) : null}
      </span>
    </label>
  );
}

function CityFiltersSidebar({
  filters,
  options,
  onChange,
  onReset,
  activeCount,
  cityName,
}: {
  filters: CityFilterState;
  options: CityFilterOptions;
  onChange: (next: CityFilterState) => void;
  onReset: () => void;
  activeCount: number;
  cityName: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold text-zinc-900">Filters</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Refine halal restaurants in {cityName}
          </p>
        </div>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 text-xs font-semibold text-halal-700 underline decoration-halal-200 underline-offset-2 hover:text-halal-900"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div className="mt-5 space-y-5">
        <FilterGroup title="Search">
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Restaurant name…"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-halal-400 focus:outline-none focus:ring-2 focus:ring-halal-500/20"
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
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-halal-400 focus:outline-none focus:ring-2 focus:ring-halal-500/20"
          >
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="rating-desc">Highest rated</option>
          </select>
        </FilterGroup>

        {options.cuisines.length > 0 ? (
          <FilterGroup title="Cuisine">
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
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
            </div>
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
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
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
            </div>
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
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-halal-400 focus:outline-none focus:ring-2 focus:ring-halal-500/20"
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
    <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="order-2 min-w-0 lg:order-1">
        <p className="text-sm font-medium text-zinc-600">
          Showing{" "}
          <span className="font-semibold text-zinc-900">
            {filtered.length.toLocaleString()}
          </span>{" "}
          of {restaurants.length.toLocaleString()} restaurants
        </p>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
            <p className="font-medium text-zinc-900">No restaurants match</p>
            <p className="mt-2 text-sm text-zinc-600">
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
          <ul className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {filtered.map((restaurant) => (
              <CityRestaurantCard key={restaurant.slug} restaurant={restaurant} />
            ))}
          </ul>
        )}
      </div>

      <aside className="order-1 lg:order-2">
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-sm"
          >
            <span>Filters{activeCount > 0 ? ` (${activeCount})` : ""}</span>
            <span aria-hidden>{mobileOpen ? "−" : "+"}</span>
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

        <div className="hidden lg:block lg:sticky lg:top-24">
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
    </div>
  );
}
