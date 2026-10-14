/** Parse DB timestamps for sitemap lastmod — never throws. */
export function parseValidSitemapDate(input: unknown): Date | undefined {
  if (input == null) return undefined;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? undefined : input;
  }
  const s = String(input).trim();
  if (!s || s === "null" || s === "undefined") return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Latest valid date from images_uploaded_at, content_generated_at, updated_at. */
export function latestSitemapDate(
  ...values: (unknown | null | undefined)[]
): Date | undefined {
  let latest: Date | undefined;
  for (const v of values) {
    const d = parseValidSitemapDate(v);
    if (!d) continue;
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

export function sitemapDateToIso(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  const t = date.getTime();
  if (Number.isNaN(t)) return undefined;
  try {
    return date.toISOString();
  } catch {
    return undefined;
  }
}
