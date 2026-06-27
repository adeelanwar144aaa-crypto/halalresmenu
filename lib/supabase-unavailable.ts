/** Thrown when Supabase is unreachable, rate-limited, or quota-blocked (not a missing row). */
export class SupabaseUnavailableError extends Error {
  readonly name = "SupabaseUnavailableError";

  constructor(message = "Supabase temporarily unavailable") {
    super(message);
  }
}

export function isSupabaseUnavailableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** True for Supabase client / PostgREST errors indicating outage or quota, not "row missing". */
export function isSupabaseUnavailableError(error: unknown): boolean {
  if (error instanceof SupabaseUnavailableError) return true;
  if (!error || typeof error !== "object") return false;

  const e = error as {
    status?: number;
    statusCode?: number;
    code?: string;
    message?: string;
  };

  const status = e.status ?? e.statusCode;
  if (typeof status === "number" && isSupabaseUnavailableStatus(status)) {
    return true;
  }

  const code = String(e.code ?? "").toUpperCase();
  if (code === "PGRST002" || code === "PGRST003") return true;

  const msg = String(e.message ?? "").toLowerCase();
  if (
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("service unavailable") ||
    msg.includes("connection") ||
    msg.includes("timeout") ||
    msg.includes("fetch failed")
  ) {
    return true;
  }

  return false;
}

export const SUPABASE_UNAVAILABLE_HEADER = "X-HRM-Supabase-Unavailable";
