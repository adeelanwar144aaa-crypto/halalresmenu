import type { Metadata } from "next";
import { extractRestaurantArea } from "@/lib/restaurant-area";
import { restaurantSubdomainUrl } from "@/lib/utils";

export type RestaurantPageType = "overview" | "menu" | "halal-info";

export type PageMetaInput = {
  pageType: RestaurantPageType;
  slug: string;
  name?: string | null;
  cuisine?: string | null;
  city?: string | null;
  address?: string | null;
  postcode?: string | null;
  ogImage?: string | null;
};

/** Deterministic 0..n-1 pick from slug (stable across builds). */
export function descriptionVariantIndex(slug: string, variantCount: number): number {
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % variantCount;
}

/**
 * Overview meta description: area-aware, ~150-160 chars, 4 sentence skeletons.
 * Title generation must stay untouched — this returns description only.
 */
function buildOverviewDescription(
  name: string,
  cuisine: string,
  area: string,
  slug: string
): string {
  const variant = descriptionVariantIndex(slug, 4);
  const openings = [
    `${name} serves ${cuisine} in ${area}.`,
    `Find ${cuisine} at ${name} in ${area}.`,
    `${name} in ${area} offers ${cuisine}.`,
    `Discover ${cuisine} at ${name} in ${area}.`,
  ] as const;

  // Longest to shortest tails per variant (same meaning, different length).
  const tails: ReadonlyArray<ReadonlyArray<string>> = [
    [
      " View verified halal certification, browse the full menu with prices, read guest reviews and prayer-aware dining details.",
      " View halal certification, browse the full menu with prices, read guest reviews and prayer-aware dining details.",
      " View halal certification, the full menu, guest reviews and prayer-aware dining details.",
      " View halal certification, full menu, reviews and prayer-aware dining info.",
    ],
    [
      " See verified halal certification, browse the full menu with prices, read guest reviews and prayer-aware dining information.",
      " See verified halal certification, browse the full menu, read reviews and prayer-aware dining information.",
      " See halal certification, browse the full menu, read reviews and prayer-aware dining information.",
      " See halal certification, full menu, reviews and prayer-aware dining information.",
    ],
    [
      " Check verified halal status and certification, the full menu with prices, guest reviews and prayer-aware dining info before you visit.",
      " Check halal status and certification, the full menu, guest reviews and prayer-aware dining info before you visit.",
      " Check halal status, the full menu, guest reviews and prayer-aware dining info before you visit.",
      " Check halal status, full menu, reviews and prayer-aware dining info before you visit.",
    ],
    [
      " Explore the full menu with prices, guest reviews, verified halal certification details and prayer-aware dining information.",
      " Explore the full menu, guest reviews, halal certification details and prayer-aware dining information.",
      " Explore the full menu, reviews, halal certification and prayer-aware dining information.",
      " Explore the full menu, reviews, halal certification and prayer-aware dining info.",
    ],
  ];

  const opening = openings[variant]!;
  const options = tails[variant]!;

  let bestUnderMax = opening + options[options.length - 1]!;
  let bestInRange: string | null = null;
  for (const tail of options) {
    const candidate = opening + tail;
    if (candidate.length > 160) continue;
    bestUnderMax = candidate;
    if (candidate.length >= 150) {
      bestInRange = candidate;
      break;
    }
  }

  let description = bestInRange ?? bestUnderMax;

  if (description.length < 150) {
    const pads = [
      " Plan your visit with confidence.",
      " Updated for diners in 2026.",
      " Updated for 2026.",
      " See details inside.",
    ];
    for (const pad of pads) {
      if (description.length + pad.length <= 160) {
        description += pad;
        if (description.length >= 150) break;
      }
    }
  }

  return description;
}

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
        const { area } = extractRestaurantArea({
          address: input.address,
          postcode: input.postcode,
          city,
        });
        return {
          title: `${nameWithRestaurantIfNeeded(name)} Menu And Reviews (Updated 2026)`,
          description: buildOverviewDescription(name, cuisine, area, input.slug),
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
          title: `${nameWithRestaurantIfNeeded(name)} Menu With Prices Updated 2026`,
          description: `View the full halal menu and prices at ${name} in ${city}. Browse all dishes, categories and updated prices for 2026.`,
        };
      }
      if (name) {
        return {
          title: `${nameWithRestaurantIfNeeded(name)} Menu With Prices Updated 2026`,
          description:
            "Browse the full halal menu with updated 2026 prices on HalalResMenu.",
        };
      }
      return {
        title: "Restaurant Menu With Prices Updated 2026",
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
