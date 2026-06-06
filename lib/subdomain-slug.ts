/** Max length for a single DNS hostname label (subdomain segment). */
export const MAX_SUBDOMAIN_SLUG_LENGTH = 63;

/** Letters, numbers, and hyphens only — safe for `slug.example.com` hostnames. */
const SUBDOMAIN_SAFE_SLUG_RE = /^[a-z0-9-]+$/;

/**
 * Returns true when `slug` can be used as a restaurant subdomain label.
 * Rejects empty, >63 chars, dots, special characters, and leading/trailing hyphens.
 */
export function isSubdomainSafeSlug(slug: string | null | undefined): boolean {
  if (slug == null) return false;

  const trimmed = slug.trim().toLowerCase();
  if (!trimmed || trimmed.length > MAX_SUBDOMAIN_SLUG_LENGTH) return false;
  if (trimmed.includes(".")) return false;
  if (trimmed.startsWith("-") || trimmed.endsWith("-")) return false;

  return SUBDOMAIN_SAFE_SLUG_RE.test(trimmed);
}
