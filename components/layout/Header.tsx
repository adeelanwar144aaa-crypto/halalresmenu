import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-halal-100/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-halal-900 transition hover:text-halal-700"
        >
          Halal<span className="text-halal-600">Res</span>Menu
        </Link>
        <nav className="flex gap-6 text-sm font-medium text-zinc-600">
          <Link href="/" className="transition hover:text-halal-800">
            Home
          </Link>
          <Link href="/#cities" className="transition hover:text-halal-800">
            Cities
          </Link>
        </nav>
      </div>
    </header>
  );
}
