import type { MenuData } from "@/types/restaurant";
import type { AboutContent, GeneratedAboutPayload } from "@/lib/about-content-types";
import { aboutContentWordCount } from "@/lib/about-content-types";

export const MIN_ABOUT_WORDS = 500;
export const MIN_SECTION_BODY_WORDS = 100;

const BANNED_PHRASES = [
  "nestled",
  "hidden gem",
  "culinary journey",
  "tantalise",
  "tantalize",
  "look no further",
  "whether you're",
  "whether you are",
  "mouth-watering",
  "mouth watering",
  "a feast for the senses",
  "elevate",
];

export function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function menuItemNames(menuData: MenuData | null): string[] {
  if (!menuData?.categories) return [];
  const names: string[] = [];
  for (const cat of menuData.categories) {
    for (const item of cat.items) {
      if (item.name?.trim()) names.push(item.name.trim());
    }
  }
  return names;
}

function fuzzyItemMatch(mention: string, items: string[]): boolean {
  const m = normalizeForMatch(mention);
  if (m.length < 3) return true;
  return items.some((name) => {
    const n = normalizeForMatch(name);
    return n.includes(m) || m.includes(n);
  });
}

function extractLikelyDishMentions(text: string, menuNames: string[]): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const name of menuNames) {
    if (name.length >= 4 && lower.includes(name.toLowerCase())) {
      found.push(name);
    }
  }
  return found;
}

export type QualityResult = { ok: true } | { ok: false; reasons: string[] };

export function validateGeneratedAbout({
  payload,
  menuData,
  aboutRaw: _aboutRaw,
  restaurantName,
  city,
}: {
  payload: GeneratedAboutPayload;
  menuData: MenuData | null;
  aboutRaw: string | null;
  restaurantName: string;
  city: string | null;
}): QualityResult {
  const reasons: string[] = [];
  const content: AboutContent = {
    intro: payload.intro,
    sections: payload.sections,
  };

  const words = aboutContentWordCount(content);
  if (payload.sections.length < 3 || payload.sections.length > 4) {
    reasons.push(`expected 3–4 sections, got ${payload.sections.length}`);
  }
  if (words < MIN_ABOUT_WORDS) {
    reasons.push(`word count ${words} below ${MIN_ABOUT_WORDS}`);
  }

  for (let i = 0; i < payload.sections.length; i++) {
    const secWords = countWords(payload.sections[i].body);
    if (secWords < MIN_SECTION_BODY_WORDS) {
      reasons.push(
        `section ${i + 1} "${payload.sections[i].heading}" body ${secWords} words (want ≥${MIN_SECTION_BODY_WORDS})`
      );
    }
  }

  const fullText = [
    payload.intro,
    payload.meta_title,
    payload.meta_description,
    ...payload.sections.map((s) => `${s.heading} ${s.body}`),
  ].join("\n");

  const lower = fullText.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) reasons.push(`banned phrase: ${phrase}`);
  }
  if (/!/.test(fullText)) reasons.push("exclamation mark present");

  if (!normalizeForMatch(fullText).includes(normalizeForMatch(restaurantName))) {
    reasons.push("restaurant name missing");
  }
  if (city && !normalizeForMatch(fullText).includes(normalizeForMatch(city))) {
    reasons.push("city missing");
  }

  const items = menuItemNames(menuData);
  const mentioned = extractLikelyDishMentions(fullText, items);
  for (const dish of mentioned) {
    if (!fuzzyItemMatch(dish, items)) {
      reasons.push(`dish not in menu: ${dish}`);
    }
  }

  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true };
}

export function qualifiesForManualReview(payload: GeneratedAboutPayload): boolean {
  const words = aboutContentWordCount({
    intro: payload.intro,
    sections: payload.sections,
  });
  if (words < MIN_ABOUT_WORDS) return false;
  if (payload.sections.length < 3 || payload.sections.length > 4) return false;
  for (const s of payload.sections) {
    if (countWords(s.body) < MIN_SECTION_BODY_WORDS) return false;
  }
  const fullText = [
    payload.intro,
    payload.meta_title,
    payload.meta_description,
    ...payload.sections.map((s) => `${s.heading} ${s.body}`),
  ].join("\n");
  return true;
}

export function weakestSection(payload: GeneratedAboutPayload): {
  index: number;
  heading: string;
  words: number;
} {
  let index = 0;
  let words = Infinity;
  payload.sections.forEach((s, i) => {
    const w = countWords(s.body);
    if (w < words) {
      words = w;
      index = i;
    }
  });
  return {
    index,
    heading: payload.sections[index]?.heading ?? "",
    words: words === Infinity ? 0 : words,
  };
}

function trimToMaxChars(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > Math.floor(max * 0.55)) return cut.slice(0, lastSpace).trim();
  return cut.slice(0, max - 1).trim() + "…";
}

/** Rewrite banned "whether you are / whether you're" without calling the API. */
export function repairWhetherBannedPhrases(text: string): string {
  let t = text;
  t = t.replace(/,\s*whether you are\b/gi, ". If you are");
  t = t.replace(/,\s*whether you're\b/gi, ". If you're");
  t = t.replace(/\bwhether you want\b/gi, "if you want");
  t = t.replace(/\bwhether you're\b/gi, "If you're");
  t = t.replace(/\bwhether you are\b/gi, "If you are");
  t = t.replace(/\.\s+If you are if you want/gi, ". If you want");
  t = t.replace(/\s{2,}/g, " ");
  return t.trim();
}

function repairWhetherInPayload(payload: GeneratedAboutPayload): GeneratedAboutPayload {
  return {
    meta_title: repairWhetherBannedPhrases(payload.meta_title),
    meta_description: repairWhetherBannedPhrases(payload.meta_description),
    intro: repairWhetherBannedPhrases(payload.intro),
    sections: payload.sections.map((s) => ({
      heading: s.heading,
      body: repairWhetherBannedPhrases(s.body),
    })),
  };
}

/** Fix meta length and missing name/city in intro without regenerating. */
export function repairMinorAboutPayload(
  payload: GeneratedAboutPayload,
  restaurantName: string,
  city: string | null
): GeneratedAboutPayload {
  const cleaned = repairWhetherInPayload(payload);
  const meta_title = trimToMaxChars(cleaned.meta_title, 60);
  const meta_description = trimToMaxChars(cleaned.meta_description, 155);
  let intro = cleaned.intro;

  const fullText = [
    intro,
    meta_title,
    meta_description,
    ...cleaned.sections.map((s) => `${s.heading} ${s.body}`),
  ].join("\n");
  let norm = normalizeForMatch(fullText);

  const nameNorm = normalizeForMatch(restaurantName);
  if (nameNorm && !norm.includes(nameNorm)) {
    intro = `${restaurantName}. ${intro}`;
  }
  norm = normalizeForMatch(
    [intro, meta_title, meta_description, ...cleaned.sections.map((s) => s.body)].join("\n")
  );
  if (city) {
    const cityNorm = normalizeForMatch(city);
    if (cityNorm && !norm.includes(cityNorm)) {
      intro = `${restaurantName} in ${city}. ${intro}`;
    }
  }

  return {
    meta_title,
    meta_description,
    intro,
    sections: cleaned.sections,
  };
}

export function preparePayloadForValidation(
  payload: GeneratedAboutPayload,
  restaurantName: string,
  city: string | null
): GeneratedAboutPayload {
  return repairMinorAboutPayload(payload, restaurantName, city);
}

export function isMinorQualityReason(reason: string): boolean {
  return (
    reason.startsWith("meta_description length") ||
    reason.startsWith("meta_title length") ||
    reason === "city missing" ||
    reason === "restaurant name missing"
  );
}

export function sentenceSet(text: string): Set<string> {
  return new Set(
    text
      .split(/[.!?]+/)
      .map((s) => normalizeForMatch(s))
      .filter((s) => s.length > 24)
  );
}

export function sentenceOverlapRatio(a: string, b: string): number {
  const sa = sentenceSet(a);
  const sb = sentenceSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let shared = 0;
  for (const s of sa) {
    if (sb.has(s)) shared++;
  }
  return shared / Math.min(sa.size, sb.size);
}
