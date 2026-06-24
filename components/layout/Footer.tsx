import Link from "next/link";
import { getApexOrigin } from "@/lib/sitemap-data";

function apexPath(path: string): string {
  return `${getApexOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

const EXPLORE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/city", label: "Cities" },
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

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-halal-100/80 bg-gradient-to-b from-white to-halal-50/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              href={apexPath("/")}
              className="text-lg font-bold tracking-tight text-halal-900 transition hover:text-halal-700"
            >
              Halal<span className="text-halal-600">Res</span>Menu
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              The UK halal dining guide — menus, certification context, and
              neighbourhood detail you can trust.
            </p>
            <p className="mt-4 text-sm font-medium text-zinc-700">
              © {year} HalalResMenu
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-800">
              Explore
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={apexPath(link.href)}
                    className="text-zinc-600 transition hover:text-halal-800"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-800">
              Company
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={apexPath(link.href)}
                    className="text-zinc-600 transition hover:text-halal-800"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-800">
              Legal
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={apexPath(link.href)}
                    className="text-zinc-600 transition hover:text-halal-800"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-xl border border-halal-100 bg-white/80 px-5 py-4">
          <p className="text-sm font-medium leading-relaxed text-zinc-700">
            Information may change. Always confirm halal status and allergens
            directly with the restaurant before you visit or order.
          </p>
        </div>
      </div>
    </footer>
  );
}
