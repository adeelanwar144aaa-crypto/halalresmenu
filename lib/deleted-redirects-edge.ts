import { getApexOrigin } from "@/lib/apex-origin";

let map: Map<string, string> | null = null;
let loadPromise: Promise<Map<string, string>> | null = null;

async function loadDeletedRedirects(originHint?: string): Promise<Map<string, string>> {
  if (map) return map;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    let origin = originHint?.replace(/\/$/, "");
    if (!origin || /localhost|127\.0\.0\.1/i.test(origin)) {
      origin = getApexOrigin().replace(/\/$/, "");
    }
    if (/localhost|127\.0\.0\.1/i.test(origin)) {
      origin = "https://halalresmenu.com";
    }
    const url = `${origin}/api/deleted-redirects`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`deleted-redirects API ${res.status}`);
    }
    const data = (await res.json()) as Record<string, string>;
    map = new Map(
      Object.entries(data).map(([slug, dest]) => [slug.toLowerCase(), dest])
    );
    return map;
  })();

  return loadPromise;
}

export async function getGeneratedDeletedRedirect(
  slug: string,
  originHint?: string
): Promise<string | null> {
  try {
    const m = await loadDeletedRedirects(originHint);
    return m.get(slug.trim().toLowerCase()) ?? null;
  } catch {
    return null;
  }
}
