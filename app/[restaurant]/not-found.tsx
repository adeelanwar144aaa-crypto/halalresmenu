import Link from "next/link";

export default function RestaurantNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="rounded-full bg-halal-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-halal-800">
        404
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        Restaurant not found
      </h1>
      <p className="mt-3 leading-relaxed text-zinc-600">
        We could not find a listing for this URL. The venue may have been
        removed, the link may be wrong, or the directory may be temporarily
        unavailable.
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
