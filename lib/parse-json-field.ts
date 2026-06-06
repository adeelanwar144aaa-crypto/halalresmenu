/** Parse JSONB columns that may arrive as objects or JSON strings from Supabase. */
export function parseJsonField<T extends object>(
  raw: unknown
): T | null {
  if (raw == null) return null;

  let value: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as T;
}
