"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SectionHeading } from "@/components/restaurant/SectionHeading";

const MAX_PHOTOS = 10;
const VISIBLE_COUNT = 3;
const GAP_PX = 16;

function ChevronLeftIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function PhotoGallerySlider({
  photoUrls,
  restaurantName,
}: {
  photoUrls: string[];
  restaurantName: string;
}) {
  const photos = photoUrls.slice(0, MAX_PHOTOS);
  const total = photos.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [stepPx, setStepPx] = useState(0);

  const maxIndex = Math.max(0, total - VISIBLE_COUNT);
  const dotCount = useMemo(() => {
    if (total <= 1) return 1;
    if (total <= VISIBLE_COUNT) return 1;
    return total - VISIBLE_COUNT + 1;
  }, [total]);

  useLayoutEffect(() => {
    const update = () => {
      const el = viewportRef.current;
      if (!el) return;
      const w =
        (el.clientWidth - GAP_PX * (VISIBLE_COUNT - 1)) / VISIBLE_COUNT;
      setSlideWidth(w);
      setStepPx(w + GAP_PX);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [total]);

  const goTo = useCallback(
    (index: number) => {
      if (total === 0) return;
      setActiveIndex(Math.max(0, Math.min(index, maxIndex)));
    },
    [total, maxIndex]
  );

  const goPrev = useCallback(() => {
    if (total === 0) return;
    setActiveIndex((i) => (i <= 0 ? maxIndex : i - 1));
  }, [maxIndex, total]);

  const goNext = useCallback(() => {
    if (total === 0) return;
    setActiveIndex((i) => (i >= maxIndex ? 0 : i + 1));
  }, [maxIndex, total]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPrev, goNext]);

  if (total === 0) return null;

  const showControls = total > VISIBLE_COUNT;

  return (
    <section
      className="border-b border-zinc-100/80 bg-white py-12 sm:py-16"
      aria-label={`${restaurantName} photos`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Photos"
          subtitle={`${total} image${total === 1 ? "" : "s"} from this listing.`}
        />

        <div
          className="mt-8"
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label={`Photo gallery for ${restaurantName}`}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            {showControls ? (
              <button
                type="button"
                onClick={goPrev}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-halal-600 text-white shadow-md transition hover:bg-halal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-halal-600 sm:h-12 sm:w-12"
                aria-label="Previous photos"
              >
                <ChevronLeftIcon />
              </button>
            ) : (
              <span className="w-11 shrink-0 sm:w-12" aria-hidden />
            )}

            <div ref={viewportRef} className="min-w-0 flex-1 overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{
                  gap: GAP_PX,
                  transform:
                    stepPx > 0
                      ? `translateX(-${activeIndex * stepPx}px)`
                      : undefined,
                }}
              >
                {photos.map((url, i) => (
                  <figure
                    key={`${url}-${i}`}
                    className="h-[280px] shrink-0 overflow-hidden rounded-[12px] bg-zinc-100"
                    style={{ width: slideWidth > 0 ? slideWidth : undefined }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${restaurantName} — photo ${i + 1}`}
                      className="h-full w-full object-cover"
                      loading={i < VISIBLE_COUNT ? "eager" : "lazy"}
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </figure>
                ))}
              </div>
            </div>

            {showControls ? (
              <button
                type="button"
                onClick={goNext}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-halal-600 text-white shadow-md transition hover:bg-halal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-halal-600 sm:h-12 sm:w-12"
                aria-label="Next photos"
              >
                <ChevronRightIcon />
              </button>
            ) : (
              <span className="w-11 shrink-0 sm:w-12" aria-hidden />
            )}
          </div>

          {dotCount > 1 && (
            <div
              className="mt-6 flex justify-center gap-2.5"
              role="tablist"
              aria-label="Gallery position"
            >
              {Array.from({ length: dotCount }, (_, i) => {
                const isActive = i === activeIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={`rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-halal-600 ${
                      isActive
                        ? "h-2.5 w-2.5 bg-halal-600"
                        : "h-2 w-2 bg-zinc-300 hover:bg-zinc-400"
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
