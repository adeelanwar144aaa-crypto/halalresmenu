import {
  authorInitials,
  formatGoogleReviewDate,
  type GooglePlaceReview,
} from "@/lib/google-reviews";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5 text-base leading-none" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rounded ? "text-amber-500" : "text-amber-200"}>
          ⭐
        </span>
      ))}
    </span>
  );
}

function AuthorAvatar({
  name,
  photoUrl,
}: {
  name: string | null;
  photoUrl: string | null;
}) {
  const displayName = name ?? "Guest";
  if (photoUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={photoUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white"
        width={40}
        height={40}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-halal-100 text-sm font-bold text-halal-800 ring-2 ring-white"
      aria-hidden
    >
      {authorInitials(name)}
    </div>
  );
}

function ReviewCard({ review }: { review: GooglePlaceReview }) {
  const dateLabel = formatGoogleReviewDate(review.time);
  const author = review.author_name ?? "Google user";

  return (
    <li className="flex flex-col rounded-[12px] bg-white p-5 shadow-md ring-1 ring-zinc-100/80">
      <div className="flex items-start gap-3">
        <AuthorAvatar name={review.author_name} photoUrl={review.profile_photo_url} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-zinc-900">{author}</p>
            {review.rating != null && <ReviewStars rating={review.rating} />}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {dateLabel ? (
              <p className="text-xs text-zinc-500">{dateLabel}</p>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
              <GoogleIcon />
              via Google
            </span>
          </div>
        </div>
      </div>
      {review.text ? (
        <p className="mt-4 flex-1 text-sm leading-[1.7] text-zinc-700">
          {review.text}
        </p>
      ) : null}
    </li>
  );
}

export function ReviewsArticle({
  restaurantName,
  reviews,
  overallRating,
  totalReviewCount,
}: {
  restaurantName: string;
  reviews: GooglePlaceReview[];
  overallRating: number | null;
  totalReviewCount: number;
}) {
  const hasCards = reviews.length > 0;
  const hasSummary =
    overallRating != null && totalReviewCount > 0;

  if (!hasCards && !hasSummary) return null;

  return (
    <section
      id="reviews"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-zinc-50/40 py-14 sm:scroll-mt-36 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-halal-700">
          Reviews
        </p>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className="mt-2 hidden h-8 w-1 shrink-0 rounded-full bg-halal-600 sm:block"
              aria-hidden
            />
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Customer Reviews for {restaurantName}
            </h2>
          </div>

          {hasSummary && overallRating != null && (
            <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-zinc-900 sm:text-xl">
              <span className="text-amber-500" aria-hidden>
                ⭐
              </span>
              <span>{overallRating.toFixed(1)}</span>
              <span className="font-normal text-zinc-600">
                ({totalReviewCount.toLocaleString()} review
                {totalReviewCount === 1 ? "" : "s"})
              </span>
            </p>
          )}
        </div>

        {hasCards && (
          <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            {reviews.map((review, i) => (
              <ReviewCard key={`${review.author_name}-${review.time}-${i}`} review={review} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
