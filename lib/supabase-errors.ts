import { SupabaseUnavailableError, isSupabaseUnavailableError } from "@/lib/supabase-unavailable";

/** Re-throw outage errors; return fallback for ordinary failures. */
export function throwIfSupabaseUnavailable(
  error: unknown,
  context?: string
): void {
  if (isSupabaseUnavailableError(error)) {
    throw new SupabaseUnavailableError(
      context ? `${context}: Supabase temporarily unavailable` : undefined
    );
  }
}
