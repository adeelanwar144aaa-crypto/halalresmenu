export function SectionErrorFallback({
  title,
  message = "This section could not be loaded right now. Please try again later.",
}: {
  title: string;
  message?: string;
}) {
  return (
    <section className="border-b border-zinc-100/80 bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
          Unavailable
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-900">
          {title}
        </h2>
        <p className="mt-3 text-sm text-zinc-600">{message}</p>
      </div>
    </section>
  );
}
