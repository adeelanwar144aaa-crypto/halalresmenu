import fs from "fs";
import path from "path";
import type { GeneratedAboutPayload } from "@/lib/about-content-types";
import { aboutContentWordCount } from "@/lib/about-content-types";

export const DRAFTS_DIR = path.resolve(process.cwd(), "scripts/drafts");

export type AboutDraftQuality = {
  pass: boolean;
  reasons: string[];
};

export type AboutDraftSource = {
  about_raw: string;
  menu_json: unknown;
};

export type AboutDraftFile = {
  slug: string;
  name: string;
  city: string | null;
  cuisine_type: string | null;
  generatedAt: string;
  meta_title: string | null;
  meta_description: string | null;
  intro: string | null;
  sections: { heading: string; body: string }[];
  wordCount: number;
  quality: AboutDraftQuality;
  source: AboutDraftSource;
  error?: string;
};

export function draftPathForSlug(slug: string): string {
  const safe = slug.replace(/[^a-z0-9-]/gi, "_");
  return path.join(DRAFTS_DIR, `${safe}.json`);
}

export function readAboutDraft(slug: string): AboutDraftFile | null {
  const p = draftPathForSlug(slug);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as AboutDraftFile;
  } catch {
    return null;
  }
}

export function writeAboutDraft(draft: AboutDraftFile): void {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  fs.writeFileSync(draftPathForSlug(draft.slug), JSON.stringify(draft, null, 2));
}

export function payloadToDraftFields(payload: GeneratedAboutPayload): {
  meta_title: string;
  meta_description: string;
  intro: string;
  sections: { heading: string; body: string }[];
  wordCount: number;
} {
  const wordCount = aboutContentWordCount({
    intro: payload.intro,
    sections: payload.sections,
  });
  return {
    meta_title: payload.meta_title,
    meta_description: payload.meta_description,
    intro: payload.intro,
    sections: payload.sections,
    wordCount,
  };
}

export function listAboutDraftFiles(): AboutDraftFile[] {
  if (!fs.existsSync(DRAFTS_DIR)) return [];
  const out: AboutDraftFile[] = [];
  for (const name of fs.readdirSync(DRAFTS_DIR)) {
    if (!name.endsWith(".json")) continue;
    try {
      out.push(
        JSON.parse(
          fs.readFileSync(path.join(DRAFTS_DIR, name), "utf8")
        ) as AboutDraftFile
      );
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) =>
    (a.name || a.slug).localeCompare(b.name || b.slug)
  );
}
