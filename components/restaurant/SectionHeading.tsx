import type { ReactNode } from "react";

type SectionHeadingProps = {
  id?: string;
  title: string;
  subtitle?: ReactNode;
  eyebrow?: string;
};

export function SectionHeading({
  id,
  title,
  subtitle,
  eyebrow,
}: SectionHeadingProps) {
  return (
    <div id={id} className="scroll-mt-32 sm:scroll-mt-36">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
          {eyebrow}
        </p>
      ) : null}
      <div className="mt-2 flex items-start gap-3">
        <span
          className="mt-1.5 hidden h-8 w-1 shrink-0 rounded-full bg-halal-600 sm:block"
          aria-hidden
        />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {title}
          </h2>
          {subtitle ? (
            <div className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
