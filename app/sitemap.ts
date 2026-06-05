import type { MetadataRoute } from "next";
import { getSupabaseServer } from "@/lib/supabase";
import { getSiteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "weekly" },
  ];

  const supabase = getSupabaseServer();
  if (!supabase) return entries;

  const { data } = await supabase.from("restaurants").select("slug,updated_at");
  for (const r of data ?? []) {
    const slug = (r as { slug: string }).slug;
    const updated = (r as { updated_at?: string }).updated_at;
    const lastModified = updated ? new Date(updated) : new Date();
    entries.push(
      {
        url: `${base}/${slug}`,
        lastModified,
        changeFrequency: "weekly",
      },
      {
        url: `${base}/${slug}/menu`,
        lastModified,
        changeFrequency: "weekly",
      },
      {
        url: `${base}/${slug}/halal-info`,
        lastModified,
        changeFrequency: "monthly",
      }
    );
  }

  return entries;
}
