import "server-only";

import fs from "fs";
import { draftPathForSlug, type AboutDraftFile } from "@/lib/about-draft";
import { isPreviewDraftsEnabled } from "@/lib/preview-drafts";

/** Read draft JSON from disk (dev + PREVIEW_DRAFTS only). */
export function loadDraftPreviewSync(slug: string): AboutDraftFile | null {
  if (!isPreviewDraftsEnabled()) return null;
  const path = draftPathForSlug(slug);
  if (!fs.existsSync(path)) return null;
  try {
    return JSON.parse(fs.readFileSync(path, "utf8")) as AboutDraftFile;
  } catch {
    return null;
  }
}
