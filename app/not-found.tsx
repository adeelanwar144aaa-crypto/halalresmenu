export const runtime = "edge";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
        404
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900">
        Page not found
      </h1>
      <p className="mt-3 leading-relaxed text-zinc-600">
        This subdomain does not match a published restaurant, or the page does
        not exist.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex rounded-xl bg-halal-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-halal-600/25 transition hover:bg-halal-700"
      >
        Back to homepage
      </Link>
    </div>
  );
}
