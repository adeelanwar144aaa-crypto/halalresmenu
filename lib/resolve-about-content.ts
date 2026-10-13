import {
  parseAboutContent,
  type AboutContent,
} from "@/lib/about-content-types";
import type { Restaurant } from "@/types/restaurant";

/** Guide copy from about_content column or seo_content.guide (pre-migration fallback). */
export function resolveAboutContent(
  row: Pick<Restaurant, "about_content" | "seo_content">
): AboutContent | null {
  const direct = parseAboutContent(row.about_content);
  if (direct) return direct;

  const raw = row.seo_content;
  if (!raw || typeof raw !== "object") return null;
  const guide = (raw as Record<string, unknown>).guide;
  return parseAboutContent(guide);
}

export function resolveSeoTitle(
  row: Pick<Restaurant, "seo_title" | "meta_title">
): string | null {
  return row.seo_title?.trim() || row.meta_title?.trim() || null;
}

export function resolveSeoMetaDescription(
  row: Pick<Restaurant, "seo_meta_description" | "meta_description">
): string | null {
  return (
    row.seo_meta_description?.trim() || row.meta_description?.trim() || null
  );
}

export function resolveContentGeneratedAt(row: {
  content_generated_at?: string | null;
  seo_content?: unknown;
  updated_at?: string | null;
}): string | null {
  if (row.content_generated_at?.trim()) return row.content_generated_at.trim();
  const sc = row.seo_content;
  if (sc && typeof sc === "object") {
    const at = (sc as Record<string, unknown>).content_generated_at;
    if (typeof at === "string" && at.trim()) return at.trim();
  }
  return null;
}
