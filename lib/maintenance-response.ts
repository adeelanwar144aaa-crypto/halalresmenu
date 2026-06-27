import { CACHE_TTL } from "@/lib/cache-config";
import { SUPABASE_UNAVAILABLE_HEADER } from "@/lib/supabase-unavailable";

export const MAINTENANCE_RETRY_AFTER_SECONDS = CACHE_TTL.HOME_AND_CITY;

export function maintenance503Html(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Temporarily unavailable | HalalResMenu</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fafafa; color: #18181b; margin: 0; }
    .wrap { max-width: 32rem; margin: 0 auto; padding: 4rem 1.5rem; text-align: center; }
    h1 { font-size: 1.75rem; font-weight: 700; margin: 0.75rem 0; }
    p { line-height: 1.6; color: #52525b; }
    a { color: #1a7a4a; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrap">
    <p style="font-size:0.75rem;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#1a7a4a;">503</p>
    <h1>Temporarily unavailable</h1>
    <p>HalalResMenu is briefly unable to load restaurant data. Please try again shortly — your usual pages will return once our database is reachable again.</p>
    <p><a href="https://halalresmenu.com/">Return to homepage</a></p>
  </div>
</body>
</html>`;
}

export function maintenance503Response(
  retryAfterSeconds = MAINTENANCE_RETRY_AFTER_SECONDS
): Response {
  return new Response(maintenance503Html(), {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": String(retryAfterSeconds),
      "X-HRM-Maintenance": "1",
      [SUPABASE_UNAVAILABLE_HEADER]: "1",
    },
  });
}
