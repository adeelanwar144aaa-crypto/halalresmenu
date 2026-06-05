import type { SeoContent } from "@/types/restaurant";

export function parseSeoContent(raw: unknown): SeoContent | null {
  if (raw == null) return null;

  let obj: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (typeof obj !== "object" || obj === null) return null;

  const record = obj as Record<string, unknown>;
  const aboutSection = String(record.about_section || "").trim();
  const h1 = String(record.h1 || "").trim();

  if (!aboutSection && !h1) return null;

  const faqRaw = Array.isArray(record.faq) ? record.faq : [];
  const faq = faqRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const question = String(e.question || "").trim();
      const answer = String(e.answer || "").trim();
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is { question: string; answer: string } => item != null);

  return {
    meta_title: String(record.meta_title || "").trim(),
    meta_description: String(record.meta_description || "").trim(),
    h1,
    about_section: aboutSection,
    faq,
  };
}

export function aboutSectionParagraphs(aboutSection: string): string[] {
  const trimmed = aboutSection.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [trimmed];
}
