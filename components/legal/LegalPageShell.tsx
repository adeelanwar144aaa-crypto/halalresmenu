import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="text-sm font-semibold text-halal-700 transition hover:text-halal-900"
      >
        ← Back to home
      </Link>
      <h1 className="mt-6 font-serif text-3xl font-bold text-zinc-900 sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">{description}</p>
      ) : null}
      <div className="mt-10 space-y-10 text-zinc-600 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-zinc-900 [&_p]:mt-3 [&_p]:leading-relaxed [&_section+section]:border-t [&_section+section]:border-zinc-100 [&_section+section]:pt-10">
        {children}
      </div>
    </div>
  );
}

export function PlaceholderLegalText() {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      [PLACEHOLDER - LEGAL REVIEW NEEDED]
    </p>
  );
}
