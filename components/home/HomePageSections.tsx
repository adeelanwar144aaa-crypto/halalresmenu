import Link from "next/link";
import type { ReactNode } from "react";
import { MENU_HIGHLIGHTS, MenuCategoryIcon } from "@/components/home/MenuCategoryIcon";

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-halal-700">
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
      {children}
    </h2>
  );
}

function SectionLead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 max-w-3xl text-lg leading-relaxed text-zinc-600">
      {children}
    </p>
  );
}

const DINING_DETAILS = [
  "Restaurant menus",
  "Opening times",
  "Address and postcode",
  "Telephone number",
  "Website links",
  "Cuisine type",
  "Delivery availability",
  "Takeaway services",
  "Collection options",
  "Seating information",
  "Family-friendly restaurants",
  "Accessibility details",
  "Payment methods",
  "Restaurant photos",
  "Map locations",
];

const POPULAR_CUISINES = [
  "Pakistani Restaurants",
  "Indian Restaurants",
  "Turkish Restaurants",
  "Lebanese Restaurants",
  "Middle Eastern Restaurants",
  "Afghan Restaurants",
  "Burgers",
  "Pizza",
  "Fried Chicken",
  "Steak Houses",
  "Seafood Restaurants",
  "Cafés",
  "Dessert Shops",
  "Ice Cream Parlours",
  "Coffee Shops",
  "Fast Food",
  "Fine Dining",
  "Buffet Restaurants",
];

const COMPARE_BY = [
  "Cuisine",
  "Location",
  "Available menu",
  "Opening hours",
  "Dining options",
  "Collection services",
  "Delivery availability",
  "Restaurant facilities",
];

const WHY_CHOOSE = [
  "Comprehensive restaurant listings",
  "Restaurant menus",
  "Opening times",
  "Contact information",
  "Location details",
  "Delivery and takeaway information",
  "Useful dining information",
  "Easy navigation across UK restaurants",
];

const MORE_UK_CITIES = [
  { name: "Leeds", slug: "leeds" },
  { name: "Liverpool", slug: "liverpool" },
  { name: "Sheffield", slug: "sheffield" },
  { name: "Nottingham", slug: "nottingham" },
  { name: "Edinburgh", slug: "edinburgh" },
  { name: "Bristol", slug: "bristol" },
  { name: "Slough", slug: "slough" },
];

function CheckIcon({ className = "text-halal-600" }: { className?: string }) {
  return (
    <svg
      className={`mt-0.5 h-5 w-5 shrink-0 ${className}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      className="h-7 w-7 text-halal-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10z"
      />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      className="h-7 w-7 text-halal-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 4h12M6 8h12M6 12h8M6 16h8M6 20h6"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      className="h-7 w-7 text-halal-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"
      />
    </svg>
  );
}

export function HomeIntroBand() {
  return (
    <section className="border-t border-zinc-200/80 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-lg leading-relaxed text-zinc-700 sm:text-xl">
            Whether you&apos;re planning a family meal, ordering a takeaway,
            meeting friends for dinner, or searching for a late-night halal
            restaurant, HalalResMenu helps you find the information you need in
            one convenient place.
          </p>
          <p className="mt-6 text-base leading-relaxed text-zinc-600">
            Explore thousands of restaurant listings featuring menus, contact
            details, locations, opening hours, cuisine types, takeaway options,
            delivery services, and more.
          </p>
        </div>
      </div>
    </section>
  );
}

export function HomeFindNearby() {
  return (
    <section className="border-t border-zinc-200/80 bg-zinc-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionEyebrow>Near you</SectionEyebrow>
            <SectionTitle>Find Halal Restaurants Near You</SectionTitle>
            <SectionLead>
              Searching for &ldquo;halal restaurants near me&rdquo;, &ldquo;halal
              food near me&rdquo;, or &ldquo;restaurant menu near me&rdquo;?
              HalalResMenu makes it easy to discover local restaurants in cities
              and towns throughout the UK.
            </SectionLead>
            <p className="mt-4 leading-relaxed text-zinc-600">
              Browse restaurants by location, cuisine, or restaurant name to
              quickly find the right place for breakfast, lunch, dinner,
              desserts, or takeaway. Whether you&apos;re at home, travelling, or
              visiting a new area, our directory helps you discover trusted halal
              dining options close to you.
            </p>
            <Link
              href="/search?city=London"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-halal-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-halal-700"
            >
              Search by city
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-card ring-1 ring-black/[0.04]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-halal-50">
                <PinIcon />
              </div>
              <div>
                <p className="font-semibold text-zinc-900">Popular searches</p>
                <p className="text-sm text-zinc-500">
                  Jump straight to what people look for most
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Halal restaurants near me",
                "Halal food near me",
                "Restaurant menu near me",
                "Halal takeaway",
                "Family restaurants",
              ].map((term) => (
                <span
                  key={term}
                  className="rounded-full bg-halal-50 px-4 py-2 text-sm font-medium text-halal-800 ring-1 ring-halal-100"
                >
                  {term}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeBrowseMenus() {
  return (
    <section className="border-t border-zinc-200/80 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <SectionEyebrow>Menus</SectionEyebrow>
          <SectionTitle>Browse Restaurant Menus Before You Visit</SectionTitle>
          <SectionLead>
            Choosing where to eat is easier when you can view the menu first.
            Our restaurant listings include menu information where available,
            allowing you to explore dishes, prices, and popular choices before
            you leave home.
          </SectionLead>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {MENU_HIGHLIGHTS.map((item) => (
            <div
              key={item.label}
              className="group flex flex-col items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50 px-3 py-4 text-center text-sm font-medium text-zinc-800 transition hover:border-halal-200 hover:bg-halal-50/60 hover:text-halal-900"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-halal-100 text-halal-700 transition group-hover:bg-halal-200">
                <MenuCategoryIcon id={item.icon} />
              </div>
              <span className="leading-snug">{item.label}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-zinc-500">
          Restaurant menus may also include pricing, popular dishes, combo
          meals, and special offers where available. As menus can change, we
          always recommend confirming the latest information directly with the
          restaurant before placing an order or visiting.
        </p>
      </div>
    </section>
  );
}

export function HomeDiningDetails() {
  return (
    <section className="border-t border-zinc-200/80 bg-gradient-to-b from-halal-950 to-halal-900 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-halal-300">
            Plan with confidence
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need Before Dining Out
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-halal-100/90">
            HalalResMenu is more than just a restaurant directory. Our goal is
            to help you make informed dining decisions by providing useful
            restaurant information in one place.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DINING_DETAILS.map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-xl bg-white/5 px-4 py-3.5 ring-1 ring-white/10"
            >
              <CheckIcon className="text-halal-300" />
              <span className="text-sm leading-relaxed text-halal-50">{item}</span>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-halal-200/80">
          We continuously update our listings to help you find accurate and
          useful information.
        </p>
      </div>
    </section>
  );
}

export function HomePopularCuisines() {
  return (
    <section className="border-t border-zinc-200/80 bg-zinc-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <SectionEyebrow>Cuisines</SectionEyebrow>
          <SectionTitle>Discover Popular Halal Cuisines</SectionTitle>
          <SectionLead>
            Whether you&apos;re craving traditional favourites or something new,
            HalalResMenu helps you discover restaurants serving a wide variety
            of halal cuisine across the UK.
          </SectionLead>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          {POPULAR_CUISINES.map((cuisine) => (
            <span
              key={cuisine}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 shadow-sm ring-1 ring-zinc-200/80"
            >
              {cuisine}
            </span>
          ))}
        </div>

        <p className="mt-8 text-zinc-600">
          Whatever you&apos;re in the mood for, our directory helps you find
          great halal dining options nearby.
        </p>
      </div>
    </section>
  );
}

export function HomeMoreCities() {
  return (
    <section className="border-t border-zinc-200/80 bg-zinc-50 py-12 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-halal-700">
          More UK locations
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-600">
          Explore halal restaurants in Leeds, Liverpool, Sheffield, Nottingham,
          Edinburgh, Bristol, Slough, and communities across the country.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {MORE_UK_CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/city/${city.slug}`}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-halal-800 shadow-sm ring-1 ring-zinc-200/80 transition hover:bg-halal-50 hover:ring-halal-200"
            >
              {city.name}
            </Link>
          ))}
          <Link
            href="/city"
            className="rounded-full bg-halal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-halal-700"
          >
            All cities
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomeCompareChoose() {
  return (
    <section className="border-t border-zinc-200/80 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionEyebrow>Compare</SectionEyebrow>
            <SectionTitle>Helping You Find the Right Restaurant</SectionTitle>
            <p className="mt-4 leading-relaxed text-zinc-600">
              Everyone has different dining preferences. Some people look for
              family-friendly restaurants, while others search for takeaway,
              delivery, late-night dining, or affordable meal options.
            </p>
            <p className="mt-4 leading-relaxed text-zinc-600">
              HalalResMenu helps you compare restaurants so you can choose the
              venue that best fits your needs before you visit.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {COMPARE_BY.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50 px-4 py-3.5"
              >
                <CheckIcon />
                <span className="text-sm font-medium text-zinc-800">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function HomeRestaurantOwners() {
  return (
    <section className="border-t border-zinc-200/80 bg-halal-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-halal-100">
          <div className="grid lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="p-8 sm:p-10 lg:p-12">
              <SectionEyebrow>Restaurant owners</SectionEyebrow>
              <SectionTitle>Own or manage a halal restaurant?</SectionTitle>
              <p className="mt-4 max-w-xl leading-relaxed text-zinc-600">
                HalalResMenu provides an opportunity to showcase your restaurant
                to customers actively searching for halal dining across the UK.
                If your restaurant information needs updating, or you would like
                to claim your listing, please get in touch.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-500">
                Keeping your menu and business details accurate helps customers
                find your restaurant more easily.
              </p>
              <Link
                href="/contact"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-halal-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-halal-700"
              >
                Contact us
                <span aria-hidden>→</span>
              </Link>
            </div>
            <div
              className="hidden h-full min-h-[220px] bg-gradient-to-br from-halal-600 to-halal-800 lg:block lg:min-w-[280px] xl:min-w-[320px]"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeWhyChoose() {
  return (
    <section className="border-t border-zinc-200/80 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <SectionEyebrow>Why HalalResMenu</SectionEyebrow>
          <SectionTitle>Why Choose HalalResMenu?</SectionTitle>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
            Thousands of diners rely on online restaurant information before
            deciding where to eat. Our mission is to make restaurant discovery
            simple.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_CHOOSE.map((item, index) => (
            <article
              key={item}
              className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-6 text-center transition hover:border-halal-200 hover:shadow-card"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-halal-100">
                {index % 3 === 0 ? (
                  <PinIcon />
                ) : index % 3 === 1 ? (
                  <MenuIcon />
                ) : (
                  <SparkIcon />
                )}
              </div>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-800">
                {item}
              </p>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-zinc-600">
          Whether you&apos;re searching for today&apos;s lunch, planning a family
          dinner, or looking for the nearest halal takeaway, HalalResMenu is
          here to help.
        </p>
      </div>
    </section>
  );
}

export function HomeStartExploring() {
  return (
    <section className="border-t border-zinc-200/80 bg-gradient-to-br from-halal-800 via-halal-700 to-halal-600 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Start Exploring Today
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-halal-100/90">
          Browse our growing collection of halal restaurants, discover new
          places to eat, compare restaurant menus, and find trusted halal dining
          options throughout the United Kingdom.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-halal-100/80">
          From local favourites to well-known restaurant chains, HalalResMenu
          helps you find the right restaurant for every occasion.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/city"
            className="rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-halal-800 transition hover:bg-halal-50"
          >
            Browse cities
          </Link>
          <Link
            href="/search"
            className="rounded-xl bg-halal-950/40 px-8 py-3.5 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-halal-950/60"
          >
            Search restaurants
          </Link>
        </div>
      </div>
    </section>
  );
}
