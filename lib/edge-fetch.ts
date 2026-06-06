/**
 * Edge/Cloudflare-safe fetch. Avoids Next.js-only `next: { revalidate }` options
 * that throw on Cloudflare Workers and Pages.
 */
export async function edgeFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...init,
    cache: init.cache ?? "no-store",
  });
}
