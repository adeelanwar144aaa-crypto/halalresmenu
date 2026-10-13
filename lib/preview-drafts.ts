import { getSiteUrl } from "@/lib/utils";
import type { AboutDraftFile } from "@/lib/about-draft";

/** Dev-only: overlay scripts/drafts/*.json on restaurant pages (never in production). */
export function isPreviewDraftsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.PREVIEW_DRAFTS?.trim().toLowerCase() === "true"
  );
}

export async function fetchDraftPreview(
  slug: string
): Promise<AboutDraftFile | null> {
  if (!isPreviewDraftsEnabled()) return null;
  const base =
    process.env.NODE_ENV === "development"
      ? (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(
          /\/$/,
          ""
        )
      : getSiteUrl().replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/dev/draft-about/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as AboutDraftFile;
  } catch {
    return null;
  }
}

export function mergeDraftPreview<
  T extends {
    seo_title?: string | null;
    seo_meta_description?: string | null;
    about_content?: unknown;
  },
>(row: T, draft: AboutDraftFile | null): { row: T; usingDraft: boolean } {
  if (!draft) return { row, usingDraft: false };
  const merged = { ...row };
  if (draft.intro?.trim() && draft.sections?.length) {
    merged.about_content = { intro: draft.intro, sections: draft.sections };
  }
  if (draft.meta_title?.trim()) merged.seo_title = draft.meta_title;
  if (draft.meta_description?.trim()) {
    merged.seo_meta_description = draft.meta_description;
  }
  return { row: merged, usingDraft: true };
}
