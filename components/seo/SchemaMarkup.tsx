import type {
  MenuData,
  MenuDataItem,
  Restaurant,
  Review,
} from "@/types/restaurant";
import { normalizeOpeningHours } from "@/lib/opening-hours-display";
import { restaurantContentUpdatedAt } from "@/lib/restaurant-freshness";
import { parseRestaurantPhotosJson } from "@/lib/restaurant-photos";

type Breadcrumb = { name: string; url: string };

const WEEK_DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const SCHEMA_DAY: Record<(typeof WEEK_DAY_KEYS)[number], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/** Strip undefined values so JSON-LD stays valid and compact. */
function stripUndefined(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value
      .map(stripUndefined)
      .filter((item) => item !== undefined);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const cleaned = stripUndefined(val);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }
  return value;
}

/** Unix seconds/ms or ISO strings → YYYY-MM-DD for schema.org datePublished. */
export function schemaDatePublished(
  raw: string | number | null | undefined
): string | undefined {
  if (raw == null) return undefined;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw > 1e12 ? raw : raw * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return undefined;
  }

  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber)) {
    const ms = asNumber > 1e12 ? asNumber : asNumber * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return undefined;
}

/** Normalize stored open/close strings to HH:MM (24h). */
export function toSchemaTime(
  raw: string | null | undefined
): string | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;

  const hm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hm) {
    return `${hm[1].padStart(2, "0")}:${hm[2]}`;
  }

  const compact = s.match(/^(\d{3,4})$/);
  if (compact) {
    const p = compact[1].padStart(4, "0");
    return `${p.slice(0, 2)}:${p.slice(2)}`;
  }

  return undefined;
}

/**
 * Build OpeningHoursSpecification from the same day-key open/close fields
 * rendered by the visible hours table (getWeekOpeningRows). Omits closed /
 * incomplete days. Returns undefined when no usable hours exist.
 */
export function buildOpeningHoursSpecification(
  opening: Restaurant["opening_hours"]
): Record<string, unknown>[] | undefined {
  const oh = normalizeOpeningHours(opening);
  if (!oh) return undefined;

  const specs: Record<string, unknown>[] = [];
  for (const key of WEEK_DAY_KEYS) {
    const day = oh[key];
    if (!day || day.closed) continue;
    const opens = toSchemaTime(day.open ?? undefined);
    const closes = toSchemaTime(day.close ?? undefined);
    if (!opens || !closes) continue;
    specs.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: SCHEMA_DAY[key],
      opens,
      closes,
    });
  }

  return specs.length > 0 ? specs : undefined;
}

function buildAggregateRating(
  restaurant: Restaurant,
  reviews: Review[]
): Record<string, unknown> | undefined {
  const reviewRatings = reviews
    .map((r) => r.rating)
    .filter((n): n is number => n != null && !Number.isNaN(n));

  let ratingValue: number | undefined;
  if (
    typeof restaurant.rating === "number" &&
    Number.isFinite(restaurant.rating) &&
    restaurant.rating > 0
  ) {
    ratingValue = restaurant.rating;
  } else if (reviewRatings.length > 0) {
    ratingValue =
      reviewRatings.reduce((sum, n) => sum + n, 0) / reviewRatings.length;
  }

  let reviewCount: number | undefined;
  if (
    typeof restaurant.total_reviews === "number" &&
    Number.isFinite(restaurant.total_reviews) &&
    restaurant.total_reviews > 0
  ) {
    reviewCount = restaurant.total_reviews;
  } else if (reviewRatings.length > 0) {
    reviewCount = reviewRatings.length;
  }

  if (ratingValue == null || reviewCount == null || reviewCount <= 0) {
    return undefined;
  }

  return {
    "@type": "AggregateRating",
    ratingValue: Number(ratingValue.toFixed(2)),
    reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}

function buildReviewNodes(reviews: Review[]): Record<string, unknown>[] {
  return reviews
    .slice(0, 8)
    .map((r) => {
      const node: Record<string, unknown> = {
        "@type": "Review",
        author: {
          "@type": "Person",
          name: r.author_name?.trim() || "Guest",
        },
      };

      const datePublished = schemaDatePublished(r.date);
      if (datePublished) node.datePublished = datePublished;

      if (r.content?.trim()) node.reviewBody = r.content.trim();

      if (r.rating != null && !Number.isNaN(r.rating)) {
        node.reviewRating = {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1,
        };
      }

      return node;
    })
    .filter((node) => node.reviewBody != null || node.reviewRating != null);
}

function buildMenuItemNode(item: MenuDataItem): Record<string, unknown> {
  return stripUndefined({
    "@type": "MenuItem",
    name: item.name,
    description: item.description ?? undefined,
    offers:
      item.price != null && Number.isFinite(item.price)
        ? {
            "@type": "Offer",
            price: item.price,
            priceCurrency: "GBP",
          }
        : undefined,
  }) as Record<string, unknown>;
}

/** Full Schema.org Menu with sections — used on the dedicated /menu page. */
export function buildFullMenuNode(
  restaurant: Restaurant,
  menuData: MenuData,
  menuId: string
): Record<string, unknown> | null {
  const sections = menuData.categories
    .map((category) => {
      const items = category.items
        .filter((item) => item.name?.trim())
        .map(buildMenuItemNode);
      if (items.length === 0) return null;
      return {
        "@type": "MenuSection",
        name: category.name,
        hasMenuItem: items,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  if (sections.length === 0) return null;

  return stripUndefined({
    "@type": "Menu",
    "@id": menuId,
    name: `Menu — ${restaurant.name}`,
    hasMenuSection: sections,
  }) as Record<string, unknown>;
}

function buildRestaurantNode(
  restaurant: Restaurant,
  url: string,
  reviews: Review[],
  opts?: { hasMenuId?: string }
): Record<string, unknown> {
  const sameAs = [restaurant.website].filter(Boolean) as string[];
  const reviewNodes = buildReviewNodes(reviews);
  const aggregateRating =
    reviewNodes.length > 0
      ? buildAggregateRating(restaurant, reviews)
      : undefined;
  // Google requires aggregateRating whenever review objects are present.
  const nestedReviews =
    aggregateRating && reviewNodes.length > 0 ? reviewNodes : undefined;

  const openingHoursSpecification = buildOpeningHoursSpecification(
    restaurant.opening_hours
  );

  const photoUrls = parseRestaurantPhotosJson(restaurant.photos).slice(0, 10);
  const contentUpdated = restaurantContentUpdatedAt(restaurant);
  const dateModified = contentUpdated
    ? contentUpdated.toISOString().slice(0, 10)
    : undefined;

  return stripUndefined({
    "@type": ["Restaurant", "FoodEstablishment", "LocalBusiness"],
    "@id": url,
    name: restaurant.name,
    url,
    image: photoUrls.length > 0 ? photoUrls : undefined,
    dateModified,
    telephone: restaurant.phone ?? undefined,
    email: restaurant.email ?? undefined,
    address: restaurant.address
      ? {
          "@type": "PostalAddress",
          streetAddress: restaurant.address,
          addressLocality: restaurant.city ?? undefined,
          addressCountry: restaurant.country ?? undefined,
        }
      : undefined,
    geo:
      restaurant.latitude != null && restaurant.longitude != null
        ? {
            "@type": "GeoCoordinates",
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
          }
        : undefined,
    servesCuisine: restaurant.cuisine_type ?? undefined,
    priceRange: restaurant.price_range ?? undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    openingHoursSpecification,
    hasMenu: opts?.hasMenuId ? { "@id": opts.hasMenuId } : undefined,
    aggregateRating,
    review: nestedReviews,
  }) as Record<string, unknown>;
}

function buildBreadcrumbNode(breadcrumbs: Breadcrumb[]): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.url,
    })),
  };
}

function buildMenuListNode(
  restaurant: Restaurant,
  menuSample: MenuDataItem[]
): Record<string, unknown> | null {
  if (menuSample.length === 0) return null;

  return stripUndefined({
    "@type": "ItemList",
    name: `Menu highlights — ${restaurant.name}`,
    itemListElement: menuSample.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: buildMenuItemNode(item),
    })),
  }) as Record<string, unknown>;
}

function buildFaqNode(restaurant: Restaurant): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${restaurant.name} halal certified?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `This listing records a halal status of ${String(restaurant.halal_status ?? "unknown")}. Always confirm with the restaurant before visiting.`,
        },
      },
      {
        "@type": "Question",
        name: `Does ${restaurant.name} serve alcohol?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            restaurant.alcohol_on_premises === null
              ? "Alcohol policy is not listed. Call the venue to confirm."
              : restaurant.alcohol_on_premises
                ? "The listing indicates alcohol may be served on the premises. Confirm with the venue."
                : "The listing indicates alcohol is not served on the premises. Confirm with the venue.",
        },
      },
    ],
  };
}

export function buildRestaurantSchemaGraph({
  restaurant,
  url,
  breadcrumbs,
  reviews = [],
  menuSample = [],
  menuData = null,
  includeFaq = false,
}: {
  restaurant: Restaurant;
  url: string;
  breadcrumbs: Breadcrumb[];
  reviews?: Review[];
  menuSample?: MenuDataItem[];
  /** When set, emit a full Schema.org Menu linked via Restaurant.hasMenu. */
  menuData?: MenuData | null;
  includeFaq?: boolean;
}): Record<string, unknown> {
  const menuId = `${url}#menu`;
  const fullMenu =
    menuData != null ? buildFullMenuNode(restaurant, menuData, menuId) : null;

  const graph: Record<string, unknown>[] = [
    buildRestaurantNode(restaurant, url, reviews, {
      hasMenuId: fullMenu ? menuId : undefined,
    }),
    buildBreadcrumbNode(breadcrumbs),
  ];

  if (fullMenu) {
    graph.push(fullMenu);
  } else {
    const menuList = buildMenuListNode(restaurant, menuSample);
    if (menuList) graph.push(menuList);
  }

  if (includeFaq) graph.push(buildFaqNode(restaurant));

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function SchemaMarkup({
  restaurant,
  url,
  breadcrumbs,
  reviews = [],
  menuSample = [],
  menuData = null,
  includeFaq = false,
}: {
  restaurant: Restaurant;
  url: string;
  breadcrumbs: Breadcrumb[];
  reviews?: Review[];
  menuSample?: MenuDataItem[];
  menuData?: MenuData | null;
  includeFaq?: boolean;
}) {
  const schema = buildRestaurantSchemaGraph({
    restaurant,
    url,
    breadcrumbs,
    reviews,
    menuSample,
    menuData,
    includeFaq,
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
