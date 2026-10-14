export const CITY_HUB_PAGE_SIZE = 24;

export function parseCityHubPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(String(value ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export function cityHubPageOffset(page: number): number {
  return (page - 1) * CITY_HUB_PAGE_SIZE;
}

export function cityHubTotalPages(total: number): number {
  if (total <= 0) return 1;
  return Math.ceil(total / CITY_HUB_PAGE_SIZE);
}

export function cityHubPagePath(
  cityPath: string,
  page: number,
  extraQuery?: Record<string, string>
): string {
  const params = new URLSearchParams(extraQuery);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${cityPath}?${qs}` : cityPath;
}

export function cityHubPageCanonical(
  origin: string,
  cityPath: string,
  page: number
): string {
  return `${origin}${cityHubPagePath(cityPath, page)}`;
}
