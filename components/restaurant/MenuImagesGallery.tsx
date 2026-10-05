"use client";

import { useCallback, useEffect, useState } from "react";

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

export function MenuImagesGallery({
  urls,
  restaurantName,
}: {
  urls: string[];
  restaurantName: string;
}) {
  const list = urls.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);

  useEffect(() => {
    if (activeIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, close]);

  if (list.length === 0) return null;

  const activeUrl = activeIndex != null ? list[activeIndex] : null;

  return (
    <section className="border-b border-zinc-100/80 bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          Menu photos
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Scanned menu pages from {restaurantName}. Tap to enlarge.
        </p>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((url, i) => {
            if (isPdfUrl(url)) {
              return (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-40 flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center text-sm font-semibold text-halal-800 transition hover:border-halal-300 hover:bg-halal-50"
                  >
                    PDF menu
                    <span className="mt-1 text-xs font-normal text-zinc-500">
                      Open in new tab
                    </span>
                  </a>
                </li>
              );
            }

            return (
              <li key={url}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className="group relative block aspect-[3/4] w-full overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-100 shadow-sm ring-1 ring-black/[0.03] transition hover:border-halal-200 hover:shadow-md"
                >
                  {/* Direct R2 URLs — avoids Next/Image optimizer issues on Cloudflare */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${restaurantName} menu page ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {activeUrl && !isPdfUrl(activeUrl) ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
            onClick={close}
          >
            Close
          </button>
          <div
            className="relative max-h-[90vh] max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeUrl}
              alt={`${restaurantName} menu enlarged`}
              className="mx-auto max-h-[90vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
