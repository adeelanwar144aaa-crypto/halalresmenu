export const runtime = "edge";

/** Must match public/ads.txt — served explicitly so /[restaurant] does not capture this path. */
const ADS_TXT_BODY =
  "google.com, pub-2261812492201764, DIRECT, f08c47fec0942fa0\n";

export async function GET() {
  return new Response(ADS_TXT_BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
