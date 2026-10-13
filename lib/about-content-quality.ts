import type { MenuData } from "@/types/restaurant";
import type { AboutContent, GeneratedAboutPayload } from "@/lib/about-content-types";
import { aboutContentWordCount } from "@/lib/about-content-types";

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

const CERT_WORDS = /\b(certified|certification|certifier|hmc|halal monitoring committee)\b/i;

export function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
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

export function menuPrices(menuData: MenuData | null): number[] {
  if (!menuData?.categories) return [];
  const prices: number[] = [];
  for (const cat of menuData.categories) {
    for (const item of cat.items) {
      if (item.price != null && Number.isFinite(item.price)) {
        prices.push(Math.round(item.price * 100) / 100);
      }
    }
  }
  return prices;
}

function fuzzyItemMatch(mention: string, items: string[]): boolean {
  const m = normalizeForMatch(mention);
  if (m.length < 3) return true;
  return items.some((name) => {
    const n = normalizeForMatch(name);
    return n.includes(m) || m.includes(n);
  });
}

function extractMentionedPrices(text: string): number[] {
  const out: number[] = [];
  const re = /£\s*(\d+(?:\.\d{1,2})?)/g;
  let m;
  while ((m = re.exec(text))) {
    out.push(parseFloat(m[1]));
  }
  return out;
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
  aboutRaw,
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
  if (words < 380 || words > 1150) {
    reasons.push(`word count ${words} outside 380–1150`);
  }
  if (payload.meta_title.length > 60) {
    reasons.push(`meta_title length ${payload.meta_title.length}`);
  }
  if (
    payload.meta_description.length < 115 ||
    payload.meta_description.length > 160
  ) {
    reasons.push(
      `meta_description length ${payload.meta_description.length} (want 115–160)`
    );
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

  const rawLower = (aboutRaw || "").toLowerCase();
  if (CERT_WORDS.test(fullText) && !CERT_WORDS.test(rawLower)) {
    reasons.push("certification mentioned but not in about_raw");
  }

  const items = menuItemNames(menuData);
  const mentioned = extractLikelyDishMentions(fullText, items);
  for (const dish of mentioned) {
    if (!fuzzyItemMatch(dish, items)) {
      reasons.push(`dish not in menu: ${dish}`);
    }
  }

  const prices = menuPrices(menuData);
  for (const p of extractMentionedPrices(fullText)) {
    if (!prices.some((mp) => Math.abs(mp - p) <= 1.05)) {
      reasons.push(`price £${p.toFixed(2)} not in menu_data`);
    }
  }

  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true };
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
