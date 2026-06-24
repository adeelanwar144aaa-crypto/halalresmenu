export const runtime = "edge";

import { NextResponse } from "next/server";

/** Legacy GSC URL — same sitemap index as /sitemap.xml */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/sitemap.xml", request.url), 308);
}
