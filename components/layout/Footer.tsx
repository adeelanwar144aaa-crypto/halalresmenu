export function Footer() {
  return (
    <footer className="mt-auto border-t border-halal-100/80 bg-gradient-to-b from-white to-halal-50/40 py-12 text-sm text-zinc-600">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="font-medium text-zinc-700">
          © {new Date().getFullYear()}{" "}
          <span className="text-halal-800">HalalResMenu</span>
        </p>
        <p className="max-w-xl text-pretty leading-relaxed">
          Information may change. Always confirm halal status and allergens
          directly with the restaurant.
        </p>
      </div>
    </footer>
  );
}
