export function averageReviewRating(
  reviews: Array<{ rating: number | null }>
): { average: number | null; count: number } {
  const nums = reviews
    .map((r) => r.rating)
    .filter((n): n is number => n != null && !Number.isNaN(n));
  if (nums.length === 0) return { average: null, count: 0 };
  const sum = nums.reduce((a, b) => a + b, 0);
  return { average: sum / nums.length, count: nums.length };
}

export function starsFromRating(rating: number | null | undefined): string {
  if (rating == null) return "—";
  const full = Math.round(rating * 2) / 2;
  return full.toFixed(1);
}
