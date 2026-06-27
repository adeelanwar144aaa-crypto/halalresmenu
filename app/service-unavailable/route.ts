export const runtime = "edge";

import { maintenance503Response } from "@/lib/maintenance-response";

/** Internal 503 page — used by middleware during Supabase outages (no stale edge cache). */
export function GET() {
  return maintenance503Response();
}
