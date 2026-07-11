import { redirect } from "next/navigation";
import { cityHubPath, resolveCanonicalCitySlug } from "@/lib/city-slug";

export const runtime = "edge";

type PageProps = { params: Promise<{ citySlug: string }> };

/** Legacy /city/[slug]/all URLs redirect to the city hub. */
export default async function CityAllRedirectPage({ params }: PageProps) {
  const { citySlug } = await params;
  const canonical = resolveCanonicalCitySlug(citySlug.toLowerCase().trim());
  redirect(cityHubPath(canonical));
}
