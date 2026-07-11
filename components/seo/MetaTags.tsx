import type { Metadata } from "next";
import { restaurantSubdomainUrl } from "@/lib/utils";

export type RestaurantPageType = "overview" | "menu" | "halal-info";

export type PageMetaInput = {
  pageType: RestaurantPageType;
  slug: string;
  name?: string | null;
  cuisine?: string | null;
  city?: string | null;
  ogImage?: string | null;
};

/** Append "Restaurant" when the name does not already include that word. */
export function nameWithRestaurantIfNeeded(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Restaurant";
  if (/\brestaurant\b/i.test(trimmed)) return trimmed;
  return `${trimmed} Restaurant`;
}

function canonicalUrlForPage(slug: string, pageType: RestaurantPageType): string {
  switch (pageType) {
    case "menu":
      return restaurantSubdomainUrl(slug, "/menu");
    case "halal-info":
      return restaurantSubdomainUrl(slug, "/halal-info");
    case "overview":
    default:
      return restaurantSubdomainUrl(slug);
  }
}

function buildTitleAndDescription(input: PageMetaInput): {
  title: string;
  description: string;
} {
  const name = input.name?.trim() || null;
  const cuisine = input.cuisine?.trim() || null;
  const city = input.city?.trim() || null;

  switch (input.pageType) {
    case "overview":
      if (name && cuisine && city) {
        return {
          title: `${nameWithRestaurantIfNeeded(name)} Menu And Reviews (Updated 2026)`,
          description: `${name} serves ${cuisine} in ${city}. View halal certification, full menu, reviews and prayer-aware dining info.`,
        };
      }
      if (name) {
        return {
          title: `${nameWithRestaurantIfNeeded(name)} Menu And Reviews (Updated 2026)`,
          description:
            "View halal certification, menu, and reviews for this restaurant on HalalResMenu.",
        };
      }
      return {
        title: "Restaurant Menu And Reviews (Updated 2026)",
        description:
          "View halal certification, menu, and reviews for this restaurant on HalalResMenu.",
      };

    case "menu":
      if (name && city) {
        return {
          title: `${nameWithRestaurantIfNeeded(name)} Menu With Prices Updates 2026`,
          description: `View the full halal menu and prices at ${name} in ${city}. Browse all dishes, categories and updated prices for 2026.`,
        };
      }
      if (name) {
        return {
          title: `${nameWithRestaurantIfNeeded(name)} Menu With Prices Updates 2026`,
          description:
            "Browse the full halal menu with updated 2026 prices on HalalResMenu.",
        };
      }
      return {
        title: "Restaurant Menu With Prices Updates 2026",
        description:
          "Browse the full halal menu with updated 2026 prices on HalalResMenu.",
      };

    case "halal-info":
      if (name && city) {
        return {
          title: `${name} | Halal Information | Updated 2026`,
          description: `View halal certification, facilities, and policies for ${name} in ${city}. Updated halal status and dining details for 2026.`,
        };
      }
      if (name) {
        return {
          title: `${name} | Halal Information | Updated 2026`,
          description:
            "View halal certification, facilities and policies for this restaurant on HalalResMenu.",
        };
      }
      return {
        title: "Restaurant | Halal Information | Updated 2026 | HalalResMenu",
        description:
          "View halal certification, facilities and policies for this restaurant on HalalResMenu.",
      };
  }
}

export function createPageMetadata(input: PageMetaInput): Metadata {
  const { title, description } = buildTitleAndDescription(input);
  const canonical = canonicalUrlForPage(input.slug, input.pageType);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "HalalResMenu",
      type: "website",
      images: input.ogImage ? [{ url: input.ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: input.ogImage ? [input.ogImage] : undefined,
    },
  };
}

/** Reserved for future client-side updates; App Router pages should use `createPageMetadata` in `generateMetadata`. */
export function MetaTags(_props: PageMetaInput) {
  return null;
}
