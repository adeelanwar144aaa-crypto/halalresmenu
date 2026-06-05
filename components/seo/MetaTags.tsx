import type { Metadata } from "next";
import { getSiteUrl, restaurantCanonicalUrl } from "@/lib/utils";

export type PageMetaInput = {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string | null;
};

export function createPageMetadata(input: PageMetaInput): Metadata {
  const site = getSiteUrl();
  const canonical = `${site}${input.canonicalPath.startsWith("/") ? input.canonicalPath : `/${input.canonicalPath}`}`;
  return {
    title: { absolute: input.title },
    description: input.description,
    alternates: { canonical },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: "HalalResMenu",
      type: "website",
      images: input.ogImage ? [{ url: input.ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: input.ogImage ? [input.ogImage] : undefined,
    },
  };
}

/** Reserved for future client-side updates; App Router pages should use `createPageMetadata` in `generateMetadata`. */
export function MetaTags(_props: PageMetaInput) {
  return null;
}
