import Link from "next/link";

export function CityBreadcrumbs({ cityName }: { cityName: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-halal-800/80">
        <li>
          <Link
            href="/"
            className="font-semibold text-halal-700 transition hover:text-halal-900"
          >
            Home
          </Link>
        </li>
        <li aria-hidden className="text-halal-400">
          /
        </li>
        <li className="font-semibold text-halal-950" aria-current="page">
          {cityName}
        </li>
      </ol>
    </nav>
  );
}
