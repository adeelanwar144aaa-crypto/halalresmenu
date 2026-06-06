import type { MetadataRoute } from "next";
import { getSupabaseServer } from "@/lib/supabase";
import { isSubdomainSafeSlug } from "@/lib/subdomain-slug";

const PAGE_SIZE = 1000;

function restaurantSubdomainUrl(slug: string, path = ""): string {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `https://${slug}.halalresmenu.com${suffix}`;
}

async function fetchAllRestaurantSlugs(): Promise<
  { slug: string; updated_at?: string | null }[]
> {
  const supabase = getSupabaseServer();
  if (!supabase) return [];

  const rows: { slug: string; updated_at?: string | null }[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("slug, updated_at")
      .not("slug", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`restaurants fetch: ${error.message}`);
    }

    if (!data?.length) break;

    for (const row of data) {
      const slug = String(row.slug ?? "").trim();
      if (isSubdomainSafeSlug(slug)) {
        rows.push({ slug, updated_at: row.updated_at });
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const restaurants = await fetchAllRestaurantSlugs();
  const entries: MetadataRoute.Sitemap = [];

  for (const restaurant of restaurants) {
    const lastModified = restaurant.updated_at
      ? new Date(restaurant.updated_at)
      : new Date();

    entries.push(
      {
        url: restaurantSubdomainUrl(restaurant.slug),
        lastModified,
        changeFrequency: "weekly",
        priority: 0.9,
      },
      {
        url: restaurantSubdomainUrl(restaurant.slug, "/menu"),
        lastModified,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: restaurantSubdomainUrl(restaurant.slug, "/halal-info"),
        lastModified,
        changeFrequency: "monthly",
        priority: 0.7,
      }
    );
  }

  return entries;
}

export const revalidate = 86400;
