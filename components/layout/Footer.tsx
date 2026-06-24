import Link from "next/link";
import type { ReactNode } from "react";
import { getApexOrigin } from "@/lib/sitemap-data";

export type FooterRestaurantCity = {
  name: string;
  slug: string;
};

function apexPath(path: string): string {
  return `${getApexOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

const MAIN_SITE_CITY_LINKS = [
  { href: "/city/london", label: "London" },
  { href: "/city/birmingham", label: "Birmingham" },
  { href: "/city/manchester", label: "Manchester" },
];

const COMPANY_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms-conditions", label: "Terms and Conditions" },
];

function buildExploreLinks(restaurantCity?: FooterRestaurantCity | null) {
  const base = [
    { href: "/", label: "Home" },
    { href: "/city", label: "Cities" },
  ];

  if (restaurantCity) {
    return [
      ...base,
      {
        href: `/city/${restaurantCity.slug}`,
        label: `More halal restaurants in ${restaurantCity.name}`,
      },
    ];
  }

  return [...base, ...MAIN_SITE_CITY_LINKS];
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

function FooterLinkList({ links }: { links: { href: string; label: string }[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2.5 text-sm">
      {links.map((link) => (
        <li key={`${link.href}-${link.label}`}>
          <Link
            href={apexPath(link.href)}
            className="font-normal text-zinc-600 no-underline transition hover:font-medium hover:text-zinc-900"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function Footer({
  restaurantCity = null,
}: {
  /** When set (restaurant subdomain), Explore shows a city-specific link. */
  restaurantCity?: FooterRestaurantCity | null;
}) {
  const year = new Date().getFullYear();
  const exploreLinks = buildExploreLinks(restaurantCity);

  return (
    <footer className="mt-auto border-t border-zinc-200/80 bg-zinc-50">
      <div className="mx-auto max-w-7xl px-5 pb-8 pt-10 sm:px-6 md:px-8 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:gap-12">
          <div className="md:col-span-2 lg:col-span-1">
            <Link
              href={apexPath("/")}
              className="text-lg font-bold tracking-tight text-halal-900 no-underline transition hover:text-halal-700"
            >
              Halal<span className="text-halal-600">Res</span>Menu
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-600">
              The UK halal dining guide — menus, certification context, and
              neighbourhood detail you can trust.
            </p>
            <p className="mt-4 text-sm font-medium text-zinc-700">
              © {year} HalalResMenu
            </p>
          </div>

          <FooterColumn title="Explore">
            <FooterLinkList links={exploreLinks} />
          </FooterColumn>

          <FooterColumn title="Company">
            <FooterLinkList links={COMPANY_LINKS} />
          </FooterColumn>

          <FooterColumn title="Legal">
            <FooterLinkList links={LEGAL_LINKS} />
          </FooterColumn>
        </div>

        <div
          className="my-8 h-px w-full bg-zinc-200/90"
          role="separator"
          aria-hidden
        />

        <div className="flex w-full gap-3 rounded-lg border-l-4 border-amber-500 bg-amber-50 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
          <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm font-semibold leading-relaxed text-amber-950">
            Information may change. Always confirm halal status and allergens
            directly with the restaurant before you visit or order.
          </p>
        </div>
      </div>
    </footer>
  );
}
