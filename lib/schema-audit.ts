import type { MenuData, Restaurant } from "@/types/restaurant";
import {
  buildRestaurantSchemaGraph,
  buildOpeningHoursSpecification,
} from "@/components/seo/SchemaMarkup";
import { parseMenuData } from "@/lib/menu-data";
import { parseRestaurantPhotosJson } from "@/lib/restaurant-photos";
import {
  normalizeAddressCountry,
  normalizeSchemaTelephone,
} from "@/lib/schema-normalize";
import { restaurantSubdomainUrl } from "@/lib/utils";

export type SchemaIssueSeverity = "error" | "warning";

export type SchemaIssue = {
  code: string;
  message: string;
  severity: SchemaIssueSeverity;
};

export type RestaurantPageKind = "overview" | "menu" | "halal-info";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HM = /^([01]\d|2[0-3]):[0-5]\d$/;
function isUkSchemaTelephone(value: string): boolean {
  const compact = value.replace(/\s/g, "");
  return /^\+44\d{9,11}$/.test(compact);
}

function walkNodes(
  root: unknown,
  visit: (node: Record<string, unknown>) => void
): void {
  if (!root || typeof root !== "object") return;
  if (Array.isArray(root)) {
    for (const x of root) walkNodes(x, visit);
    return;
  }
  const obj = root as Record<string, unknown>;
  visit(obj);
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") walkNodes(v, visit);
  }
}

function nodeTypes(node: Record<string, unknown>): string[] {
  const t = node["@type"];
  if (!t) return [];
  return Array.isArray(t) ? t.map(String) : [String(t)];
}

function hasType(node: Record<string, unknown>, type: string): boolean {
  return nodeTypes(node).includes(type);
}

function collectByType(
  schema: Record<string, unknown>
): Map<string, Record<string, unknown>[]> {
  const map = new Map<string, Record<string, unknown>[]>();
  walkNodes(schema, (node) => {
    for (const t of nodeTypes(node)) {
      const list = map.get(t) ?? [];
      list.push(node);
      map.set(t, list);
    }
  });
  return map;
}

function isAbsoluteHttps(url: unknown): url is string {
  return typeof url === "string" && /^https:\/\//i.test(url);
}

export function auditSchemaDocument(
  schema: Record<string, unknown>,
  ctx: {
    slug: string;
    page: RestaurantPageKind;
    expectedRestaurantUrl: string;
    includeFaq?: boolean;
  }
): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const { slug, page, expectedRestaurantUrl, includeFaq } = ctx;

  if (schema["@context"] !== "https://schema.org") {
    issues.push({
      code: "invalid_context",
      message: `@context must be https://schema.org`,
      severity: "error",
    });
  }

  const byType = collectByType(schema);

  const restaurants = byType.get("Restaurant") ?? [];
  if (restaurants.length === 0) {
    issues.push({
      code: "missing_restaurant",
      message: "No Restaurant node in @graph",
      severity: "error",
    });
  } else if (restaurants.length > 1) {
    issues.push({
      code: "duplicate_restaurant",
      message: `Multiple Restaurant nodes (${restaurants.length})`,
      severity: "error",
    });
  }

  const restaurant = restaurants[0];
  if (restaurant) {
    const id = restaurant["@id"];
    if (id !== expectedRestaurantUrl) {
      issues.push({
        code: "restaurant_id_mismatch",
        message: `Restaurant @id ${String(id)} !== ${expectedRestaurantUrl}`,
        severity: "error",
      });
    }
    if (restaurant.url !== expectedRestaurantUrl) {
      issues.push({
        code: "restaurant_url_mismatch",
        message: `Restaurant url ${String(restaurant.url)} !== ${expectedRestaurantUrl}`,
        severity: "error",
      });
    }

    const tel = restaurant.telephone;
    if (tel != null && typeof tel === "string" && !isUkSchemaTelephone(tel)) {
      issues.push({
        code: "telephone_format",
        message: `telephone not +44 E.164: ${tel}`,
        severity: "warning",
      });
    }

    const addr = restaurant.address;
    if (addr && typeof addr === "object") {
      const country = (addr as Record<string, unknown>).addressCountry;
      if (country !== "GB") {
        issues.push({
          code: "address_country",
          message: `addressCountry should be GB, got ${String(country)}`,
          severity: "warning",
        });
      }
    }

    const geo = restaurant.geo;
    if (geo && typeof geo === "object") {
      const g = geo as Record<string, unknown>;
      if (typeof g.latitude !== "number" || typeof g.longitude !== "number") {
        issues.push({
          code: "geo_type",
          message: "geo latitude/longitude must be numbers",
          severity: "error",
        });
      }
    }

    const images = restaurant.image;
    const imageList = Array.isArray(images) ? images : images ? [images] : [];
    for (const img of imageList) {
      if (!isAbsoluteHttps(img)) {
        issues.push({
          code: "image_url",
          message: `Restaurant image must be absolute https: ${String(img)}`,
          severity: "error",
        });
      }
    }

    const modified = restaurant.dateModified;
    if (modified != null && !ISO_DATE.test(String(modified))) {
      issues.push({
        code: "date_modified",
        message: `dateModified must be YYYY-MM-DD: ${String(modified)}`,
        severity: "warning",
      });
    }

    const hours = restaurant.openingHoursSpecification;
    if (Array.isArray(hours)) {
      for (const h of hours) {
        if (!h || typeof h !== "object") continue;
        const spec = h as Record<string, unknown>;
        const opens = spec.opens;
        const closes = spec.closes;
        if (typeof opens === "string" && !TIME_HM.test(opens)) {
          issues.push({
            code: "hours_opens",
            message: `Invalid opens time: ${opens}`,
            severity: "warning",
          });
        }
        if (typeof closes === "string" && !TIME_HM.test(closes)) {
          issues.push({
            code: "hours_closes",
            message: `Invalid closes time: ${closes}`,
            severity: "warning",
          });
        }
      }
    }

    const reviews = restaurant.review;
    const agg = restaurant.aggregateRating;
    if (Array.isArray(reviews) && reviews.length > 0 && !agg) {
      issues.push({
        code: "reviews_without_aggregate",
        message: "Review nodes present without aggregateRating",
        severity: "error",
      });
    }
    if (agg && (!Array.isArray(reviews) || reviews.length === 0)) {
      issues.push({
        code: "aggregate_without_reviews",
        message: "aggregateRating without review array (Google pairing)",
        severity: "warning",
      });
    }
  }

  const breadcrumbs = byType.get("BreadcrumbList") ?? [];
  if (breadcrumbs.length > 0) {
    issues.push({
      code: "breadcrumb_without_ui",
      message: "BreadcrumbList present but no visible breadcrumb UI on site",
      severity: "error",
    });
  }

  const faqs = byType.get("FAQPage") ?? [];
  if (faqs.length > 0 && includeFaq) {
    issues.push({
      code: "faq_not_visible",
      message: "FAQPage markup without matching visible FAQ section",
      severity: "error",
    });
  }

  const menus = byType.get("Menu") ?? [];
  if (page === "menu" && menus.length === 0) {
    issues.push({
      code: "menu_page_missing_menu",
      message: "Menu page schema missing Menu entity",
      severity: "warning",
    });
  }

  for (const menu of menus) {
    const expectedMenuId = `${expectedRestaurantUrl}#menu`;
    if (menu["@id"] !== expectedMenuId) {
      issues.push({
        code: "menu_id",
        message: `Menu @id ${String(menu["@id"])} !== ${expectedMenuId}`,
        severity: "error",
      });
    }
  }

  walkNodes(schema, (node) => {
    if (hasType(node, "Offer")) {
      if (node.priceCurrency !== "GBP") {
        issues.push({
          code: "offer_currency",
          message: `Offer priceCurrency must be GBP`,
          severity: "warning",
        });
      }
      if (node.price != null && typeof node.price !== "number") {
        issues.push({
          code: "offer_price",
          message: "Offer price must be a number",
          severity: "error",
        });
      }
    }
  });

  if (!slug) {
    issues.push({ code: "empty_slug", message: "Empty slug", severity: "error" });
  }

  return issues;
}

export function buildSchemaForRestaurantPage(
  restaurant: Restaurant,
  page: RestaurantPageKind,
  opts?: { includeFaq?: boolean; menuData?: MenuData | null }
): Record<string, unknown> {
  const url = restaurantSubdomainUrl(restaurant.slug);
  const menuData =
    opts?.menuData !== undefined
      ? opts.menuData
      : parseMenuData(restaurant.menu_data);

  return buildRestaurantSchemaGraph({
    restaurant,
    url,
    reviews: [],
    menuSample: [],
    menuData: page === "menu" ? menuData : null,
    includeFaq: opts?.includeFaq ?? false,
  });
}

export function auditRestaurantRow(
  restaurant: Restaurant,
  pages: RestaurantPageKind[] = ["overview", "menu", "halal-info"]
): SchemaIssue[] {
  const url = restaurantSubdomainUrl(restaurant.slug);
  const menuData = parseMenuData(restaurant.menu_data);
  const all: SchemaIssue[] = [];

  for (const page of pages) {
    if (page === "menu" && !menuData) continue;

    const schema = buildRestaurantSchemaGraph({
      restaurant,
      url,
      reviews: [],
      menuSample: [],
      menuData: page === "menu" ? menuData : null,
      includeFaq: false,
    });

    all.push(
      ...auditSchemaDocument(schema, {
        slug: restaurant.slug,
        page,
        expectedRestaurantUrl: url,
        includeFaq: false,
      })
    );
  }

  if (!normalizeSchemaTelephone(restaurant.phone)) {
    if (restaurant.phone?.trim()) {
      all.push({
        code: "missing_telephone_normalized",
        message: "Phone present but failed normalization",
        severity: "warning",
      });
    }
  }

  const photoUrls = parseRestaurantPhotosJson(restaurant.photos);
  if (photoUrls.length === 0) {
    all.push({
      code: "missing_image",
      message: "No restaurant photos for schema image",
      severity: "warning",
    });
  }

  if (
    restaurant.latitude == null ||
    restaurant.longitude == null ||
    !Number.isFinite(restaurant.latitude) ||
    !Number.isFinite(restaurant.longitude)
  ) {
    all.push({
      code: "missing_geo",
      message: "Missing latitude/longitude",
      severity: "warning",
    });
  }

  const hours = buildOpeningHoursSpecification(restaurant.opening_hours);
  if (!hours?.length) {
    all.push({
      code: "missing_hours",
      message: "No openingHoursSpecification derivable from data",
      severity: "warning",
    });
  }

  if (!restaurant.phone?.trim()) {
    all.push({
      code: "missing_telephone",
      message: "No telephone on listing",
      severity: "warning",
    });
  }

  normalizeAddressCountry(restaurant.country);

  return all;
}

export type SchemaAuditSummary = {
  totalPages: number;
  pagesWithErrors: number;
  pagesWithWarnings: number;
  missingTelephone: number;
  missingGeo: number;
  missingHours: number;
  missingImage: number;
  topIssues: { code: string; count: number; exampleSlugs: string[] }[];
};

export function summarizeAudits(
  results: { slug: string; issues: SchemaIssue[] }[]
): SchemaAuditSummary {
  let pagesWithErrors = 0;
  let pagesWithWarnings = 0;
  let missingTelephone = 0;
  let missingGeo = 0;
  let missingHours = 0;
  let missingImage = 0;

  const issueCounts = new Map<
    string,
    { count: number; slugs: string[] }
  >();

  for (const { slug, issues } of results) {
    const hasError = issues.some((i) => i.severity === "error");
    const hasWarning = issues.some((i) => i.severity === "warning");
    if (hasError) pagesWithErrors++;
    if (hasWarning) pagesWithWarnings++;

    for (const issue of issues) {
      if (issue.code === "missing_telephone") missingTelephone++;
      if (issue.code === "missing_geo") missingGeo++;
      if (issue.code === "missing_hours") missingHours++;
      if (issue.code === "missing_image") missingImage++;

      const bucket = issueCounts.get(issue.code) ?? { count: 0, slugs: [] };
      bucket.count++;
      if (bucket.slugs.length < 3 && !bucket.slugs.includes(slug)) {
        bucket.slugs.push(slug);
      }
      issueCounts.set(issue.code, bucket);
    }
  }

  const topIssues = [...issueCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([code, { count, slugs }]) => ({
      code,
      count,
      exampleSlugs: slugs,
    }));

  return {
    totalPages: results.length,
    pagesWithErrors,
    pagesWithWarnings,
    missingTelephone,
    missingGeo,
    missingHours,
    missingImage,
    topIssues,
  };
}
