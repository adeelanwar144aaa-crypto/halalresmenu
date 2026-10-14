/**
 * Generate about guide drafts (no Supabase writes). Publish with publish-about-content.ts.
 *
 * Usage:
 *   npm run generate:about:batch
 *   npm run generate:about -- --only slug1,slug2 --draft
 *   npx tsx scripts/generate-about-content.ts --dry-run --sample
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import pLimit from "p-limit";
import { createClient } from "@supabase/supabase-js";
import { parseMenuData } from "@/lib/menu-data";
import type { GeneratedAboutPayload } from "@/lib/about-content-types";
import { aboutContentWordCount } from "@/lib/about-content-types";
import {
  MIN_ABOUT_WORDS,
  preparePayloadForValidation,
  qualifiesForManualReview,
  sentenceOverlapRatio,
  validateGeneratedAbout,
  weakestSection,
} from "@/lib/about-content-quality";
import type { AboutDraftQualityStatus } from "@/lib/about-draft";
import {
  draftPathForSlug,
  payloadToDraftFields,
  readAboutDraft,
  writeAboutDraft,
  type AboutDraftFile,
} from "@/lib/about-draft";
import { normalizeOpeningHours } from "@/lib/opening-hours-display";
import { parseRestaurantPhotosJson } from "@/lib/restaurant-photos";
import type { MenuData, Restaurant } from "@/types/restaurant";

const MODEL = "claude-haiku-5-5";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 10000;
const PARALLEL = 8;

class BillingExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingExhaustedError";
  }
}

let billingAbort = false;

function isBillingError(message: string): boolean {
  return /credit balance|too low to access|billing/i.test(message);
}

const INPUT_USD_PER_M = 0.1;
const OUTPUT_USD_PER_M = 0.5;
const CACHE_READ_USD_PER_M = 0.01;

const SYSTEM_PROMPT = `You write restaurant guide pages for halalresmenu.com, a UK directory of restaurants. Write for real people deciding where to eat.

Use ONLY facts in the provided ABOUT text, MENU and DETAILS. Never invent anything: no owners, history, awards, reviews, ratings, opening years, parking, delivery apps, atmosphere details, or dishes not in the menu.

Do NOT write about halal certification or halal status at all: no "certified", no certifier names, no halal status section, no advice to confirm halal with the restaurant.

Length: target about 1000 words total (minimum 500). No maximum—write as much real detail as the data supports. Never pad with invented facts or repeat yourself.

Structure: a short intro paragraph (no heading), then exactly 3 or 4 sections with H2 headings. Each section body at least 100 words.

Headings must be specific to the restaurant and match search intent, using the restaurant name and city. Pick 3–4 from these patterns (vary wording and order between restaurants):
- About [Name] in [City]
- What to order at [Name]
- [Name] menu
- Location, opening hours and how to visit [Name]
- Why people choose [Name] in [Area/City]

To reach ~1000 words without padding, go deeper on real data: describe many menu items by exact name; briefly explain what dishes are (e.g. what a karahi or shawarma platter is); group items into starters, mains, sides, desserts and drinks; suggest combinations for solo diners, couples, families and groups using real items.

Style: plain, specific, UK English. No clichés: never use "nestled", "hidden gem", "culinary journey", "tantalise", "look no further", "whether you're", "mouth-watering", "a feast for the senses", "elevate". No exclamation marks. No FAQ section. No calls to action like "book now".

Return ONLY valid JSON:
{
  "meta_title": "<= 60 chars, name + cuisine + city",
  "meta_description": "<= 155 chars, specific, mentions 1–2 dishes",
  "intro": "...",
  "sections": [{ "heading": "...", "body": "paragraphs separated by \\n\\n" }]
}`;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const SAMPLE = args.includes("--sample");
const BATCH_ABOUT = args.includes("--batch-about");
const DRAFT_MODE = args.includes("--draft");

function parseSlugList(flag: string): string[] | null {
  const eq = args.find((a) => a.startsWith(`${flag}=`));
  if (eq) {
    return eq
      .slice(flag.length + 1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const i = args.indexOf(flag);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")) {
    return args[i + 1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return null;
}

const SLUGS =
  parseSlugList("--slugs") ?? parseSlugList("--only") ?? null;

const logsDir = path.resolve(process.cwd(), "scripts/logs");
const rawLogDir = path.join(logsDir, "raw");
fs.mkdirSync(logsDir, { recursive: true });
fs.mkdirSync(rawLogDir, { recursive: true });
const failedLog = path.join(logsDir, "content-failed.log");

const ABOUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    meta_title: { type: "string" },
    meta_description: { type: "string" },
    intro: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          body: { type: "string" },
        },
        required: ["heading", "body"],
        additionalProperties: false,
      },
    },
  },
  required: ["meta_title", "meta_description", "intro", "sections"],
  additionalProperties: false,
} as const;
const R2_PUBLIC =
  process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ||
  "https://pub-74c1c686fc79435981404eb4c207734f.r2.dev";

const aboutFromR2 = new Map<string, string>();

type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
};

function emptyUsage(): TokenUsage {
  return { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 };
}

function addUsage(total: TokenUsage, u?: Partial<TokenUsage> | null): void {
  if (!u) return;
  total.input_tokens += u.input_tokens ?? 0;
  total.output_tokens += u.output_tokens ?? 0;
  total.cache_read_input_tokens += u.cache_read_input_tokens ?? 0;
}

function usageFromApi(raw: Record<string, unknown> | undefined): TokenUsage {
  if (!raw) return emptyUsage();
  return {
    input_tokens: Number(raw.input_tokens ?? 0),
    output_tokens: Number(raw.output_tokens ?? 0),
    cache_read_input_tokens: Number(raw.cache_read_input_tokens ?? 0),
  };
}

function estimateUsd(u: TokenUsage): number {
  return (
    (u.input_tokens / 1_000_000) * INPUT_USD_PER_M +
    (u.output_tokens / 1_000_000) * OUTPUT_USD_PER_M +
    (u.cache_read_input_tokens / 1_000_000) * CACHE_READ_USD_PER_M
  );
}

async function fetchAboutFromR2(slug: string): Promise<string> {
  if (aboutFromR2.has(slug)) return aboutFromR2.get(slug)!;
  const url = `${R2_PUBLIC}/restaurants/${slug}/about.txt`;
  try {
    const res = await fetch(url);
    const text = res.ok ? (await res.text()).trim() : "";
    aboutFromR2.set(slug, text);
    return text;
  } catch {
    aboutFromR2.set(slug, "");
    return "";
  }
}

function menuForPrompt(menu: MenuData | null): MenuData | null {
  if (!menu?.categories?.length) return menu;
  return {
    ...menu,
    categories: menu.categories.map((cat) => ({
      name: cat.name,
      items: cat.items.map((item) => ({
        name: item.name,
        description: item.description,
      })),
    })),
  };
}

function menuSampleForPrompt(menu: MenuData | null, maxItems = 55): MenuData | null {
  const stripped = menuForPrompt(menu);
  if (!stripped?.categories?.length) return stripped;
  let count = 0;
  const categories = [];
  for (const cat of stripped.categories) {
    const items = [];
    for (const item of cat.items) {
      if (count >= maxItems) break;
      items.push(item);
      count++;
    }
    if (items.length > 0) {
      categories.push({ name: cat.name, items });
    }
    if (count >= maxItems) break;
  }
  return { ...stripped, categories };
}

function logVerboseResult(
  verbose: boolean,
  slug: string,
  name: string,
  wordCount: number,
  qualityLabel: string,
  usage: TokenUsage
): void {
  if (!verbose) return;
  console.log(`\n=== ${slug} (${name}) ===`);
  console.log("Word count:", wordCount);
  console.log("Quality:", qualityLabel);
  console.log(
    "Tokens:",
    `in=${usage.input_tokens}`,
    `out=${usage.output_tokens}`,
    `cache_read=${usage.cache_read_input_tokens}`
  );
  console.log("Est. cost: $" + estimateUsd(usage).toFixed(4));
  console.log("Preview:", `http://localhost:3000/${slug}`);
  console.log("Preview (subdomain):", `http://${slug}.localhost:3000/`);
}

function buildUserPayload(
  row: Restaurant,
  aboutRaw: string,
  extraUserNote?: string
): string {
  const menuFull = parseMenuData(row.menu_data);
  const menuItemCount =
    menuFull?.categories?.reduce((n, c) => n + c.items.length, 0) ?? 0;
  const menu =
    menuItemCount > 80
      ? menuSampleForPrompt(menuFull)
      : menuForPrompt(menuFull);
  const hours = normalizeOpeningHours(row.opening_hours);
  const sizeNote =
    menuItemCount > 80
      ? `Menu truncated to ${menu?.categories?.reduce((n, c) => n + c.items.length, 0) ?? 0} sample items (full menu has ${menuItemCount}). Use many by exact name to reach ~1000 words.`
      : undefined;
  const notes = [sizeNote, extraUserNote].filter(Boolean).join("\n\n");
  return JSON.stringify(
    {
      name: row.name,
      city: row.city,
      address: row.address,
      postcode: row.postcode,
      cuisine: row.cuisine_type,
      phone: row.phone,
      opening_hours: hours,
      about_raw: aboutRaw,
      menu_data: menu,
    },
    null,
    2
  ) + (notes ? `\n\n${notes}` : "");
}

function hasPassDraft(slug: string): boolean {
  const d = readAboutDraft(slug);
  if (!d?.quality) return false;
  if (d.quality.status === "PASS") return true;
  return Boolean(d.quality.pass && d.quality.status !== "FAIL" && d.quality.status !== "REVIEW");
}

function hasR2Photos(row: Restaurant): boolean {
  const photos = parseRestaurantPhotosJson(row.photos);
  const r2Needle = "r2.dev";
  const publicHost = R2_PUBLIC.replace(/^https?:\/\//, "").split("/")[0];
  return photos.some(
    (u) => u.includes(r2Needle) || (publicHost && u.includes(publicHost))
  );
}

function hasRestaurantMenu(row: Restaurant): boolean {
  const menu = parseMenuData(row.menu_data);
  return (
    menu?.source === "restaurant_menu" &&
    (menu.categories?.some((c) => c.items.length > 0) ?? false)
  );
}

function batchScopeEligible(row: Restaurant): boolean {
  return hasR2Photos(row) && hasRestaurantMenu(row);
}

function isPublishedOnSite(row: Restaurant): boolean {
  if (!row.content_generated_at?.trim()) return false;
  const ac = row.about_content as { intro?: string } | null | undefined;
  return Boolean(ac?.intro?.trim());
}

function writeDraftRecord(
  row: Restaurant,
  partial: Partial<AboutDraftFile> & Pick<AboutDraftFile, "quality">
): void {
  const base: AboutDraftFile = {
    slug: row.slug,
    name: row.name,
    city: row.city,
    cuisine_type: row.cuisine_type,
    generatedAt: new Date().toISOString(),
    meta_title: null,
    meta_description: null,
    intro: null,
    sections: [],
    wordCount: 0,
    quality: partial.quality,
    source: {
      about_raw: row.about_raw?.trim() ?? "",
      menu_json: parseMenuData(row.menu_data),
    },
    ...partial,
  };
  writeAboutDraft(base);
}

async function anthropicFetch(
  apiKey: string,
  pathname: string,
  init?: RequestInit
) {
  const res = await fetch(`https://api.anthropic.com${pathname}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    if (isBillingError(text)) {
      billingAbort = true;
      throw new BillingExhaustedError(text.slice(0, 500));
    }
    throw new Error(`Anthropic ${pathname} ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

function stripCodeFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  }
  return t.trim();
}

function extractJsonObjectString(raw: string): string {
  const t = stripCodeFences(raw);
  const start = t.indexOf("{");
  if (start < 0) throw new Error("no JSON object in response");
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return t.slice(start, i + 1);
    }
  }
  throw new Error("no complete JSON object in response");
}

function logRawModelResponse(slug: string, raw: string, label: string): void {
  const safe = slug.replace(/[^a-z0-9-]/gi, "_");
  const file = path.join(rawLogDir, `${safe}.txt`);
  fs.writeFileSync(
    file,
    `=== ${label} ${new Date().toISOString()} ===\n\n${raw}`
  );
}

function parseModelJson(raw: string, slug?: string): GeneratedAboutPayload {
  try {
    const jsonStr = extractJsonObjectString(raw);
    return JSON.parse(jsonStr) as GeneratedAboutPayload;
  } catch (e) {
    if (slug) logRawModelResponse(slug, raw, "parse-failed");
    throw e;
  }
}

function buildCorrectionUserMessage(
  previous: GeneratedAboutPayload,
  reasons: string[],
  extra?: string
): string {
  return `You previously generated this article JSON:

${JSON.stringify(previous, null, 2)}

It failed quality checks:
${reasons.map((r) => `- ${r}`).join("\n")}
${extra ? `\n${extra}\n` : ""}
Return the COMPLETE corrected JSON object with the same structure (meta_title, meta_description, intro, sections with heading and body). Include every section—not just the ones you changed. No markdown code fences.`;
}

function wordCountRetryHint(
  payload: GeneratedAboutPayload,
  wordCount: number
): string | undefined {
  if (wordCount < MIN_ABOUT_WORDS) {
    const weak = weakestSection(payload);
    return `Total word count is ${wordCount}; minimum ${MIN_ABOUT_WORDS}, target ~1000. Expand the shortest section "${weak.heading}" (currently ~${weak.words} words in the body) using more menu detail and dish descriptions from the data. Do not invent facts.`;
  }
  return undefined;
}

function extractMessageText(parsed: {
  content?: { type?: string; text?: string }[];
}): string {
  return (
    parsed.content
      ?.filter((b) => b.type === "text" || b.text)
      .map((b) => b.text || "")
      .join("") || ""
  );
}

async function messageOnce(
  apiKey: string,
  user: string
): Promise<{ text: string; usage: TokenUsage; stop_reason: string | null }> {
  if (billingAbort) {
    throw new BillingExhaustedError("Batch stopped: billing/credit error");
  }
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    output_config: {
      effort: "medium" as const,
      format: {
        type: "json_schema",
        schema: ABOUT_JSON_SCHEMA,
      },
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: user }],
  };
  const parsed = await anthropicFetch(apiKey, "/v1/messages", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return {
    text: extractMessageText(parsed),
    usage: usageFromApi(parsed.usage),
    stop_reason: (parsed.stop_reason as string) ?? null,
  };
}

async function callMessages(
  apiKey: string,
  user: string
): Promise<{ text: string; usage: TokenUsage }> {
  let result = await messageOnce(apiKey, user);
  let usage = emptyUsage();
  addUsage(usage, result.usage);
  if (result.stop_reason === "max_tokens") {
    const retry = await messageOnce(
      apiKey,
      `${user}\n\nYour previous response hit max_tokens and was cut off. Return the COMPLETE JSON object in one response.`
    );
    addUsage(usage, retry.usage);
    result = retry;
  }
  return { text: result.text, usage };
}

function eligible(row: Restaurant): boolean {
  const hasAbout = Boolean(row.about_raw?.trim());
  const menu = parseMenuData(row.menu_data);
  const hasMenu =
    menu?.source === "restaurant_menu" &&
    (menu.categories?.some((c) => c.items.length > 0) ?? false);
  return hasAbout || hasMenu;
}

const RESTAURANT_SELECT_FULL =
  "id, slug, name, city, address, postcode, phone, cuisine_type, opening_hours, about_raw, about_content, content_generated_at, menu_data, photos, halal_status, halal_certifier, description, seo_content, meta_title, meta_description";
const RESTAURANT_SELECT_LEGACY =
  "id, slug, name, city, address, postcode, phone, cuisine_type, opening_hours, menu_data, photos, halal_status, halal_certifier, description, seo_content, meta_title, meta_description";

async function fetchRestaurants(
  supabase: ReturnType<typeof createClient>
): Promise<Restaurant[]> {
  const probe = await supabase.from("restaurants").select("about_raw").limit(1);
  const select =
    probe.error && /about_raw/i.test(probe.error.message ?? "")
      ? RESTAURANT_SELECT_LEGACY
      : RESTAURANT_SELECT_FULL;

  const rows: Restaurant[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select(select)
      .not("slug", "is", null)
      .order("id", { ascending: true })
      .range(from, from + 499);
    if (error) throw error;
    const batch = (data ?? []) as Restaurant[];
    if (batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < 500) break;
    from += 500;
  }
  return rows;
}

async function pickSampleRows(rows: Restaurant[]): Promise<Restaurant[]> {
  const eligibleRows = rows.filter(eligible);
  const withLongAbout = eligibleRows
    .filter((r) => (r.about_raw?.length ?? 0) > 800)
    .slice(0, 1);
  const withShortAbout = eligibleRows
    .filter(
      (r) =>
        r.about_raw?.trim() &&
        (r.about_raw?.length ?? 0) <= 400 &&
        !withLongAbout.some((x) => x.id === r.id)
    )
    .slice(0, 1);
  const menuOnly = eligibleRows
    .filter((r) => !r.about_raw?.trim() && parseMenuData(r.menu_data))
    .slice(0, 1);
  const cuisines = new Set<string>();
  const diverse: Restaurant[] = [];
  for (const r of eligibleRows) {
    const c = (r.cuisine_type || "unknown").toLowerCase();
    if (cuisines.has(c)) continue;
    cuisines.add(c);
    diverse.push(r);
    if (diverse.length >= 2) break;
  }
  const picked = new Map<string, Restaurant>();
  for (const r of [
    ...withLongAbout,
    ...withShortAbout,
    ...menuOnly,
    ...diverse,
  ]) {
    picked.set(r.slug, r);
  }
  while (picked.size < 5) {
    const next = eligibleRows.find((r) => !picked.has(r.slug));
    if (!next) break;
    picked.set(next.slug, next);
  }
  return [...picked.values()].slice(0, 5);
}

type ProcessOutcome =
  | {
      kind: "generated" | "review";
      slug: string;
      text: string;
      usage: TokenUsage;
      status: AboutDraftQualityStatus;
      words: number;
      reasons: string[];
    }
  | {
      kind: "failed" | "skipped";
      slug: string;
      usage: TokenUsage;
      status: AboutDraftQualityStatus | "SKIP";
      words: number;
      reasons: string[];
    };

async function processRestaurant(
  apiKey: string,
  row: Restaurant,
  savedTexts: { slug: string; text: string }[],
  verbose: boolean
): Promise<ProcessOutcome> {
  const usage = emptyUsage();
  const slug = row.slug;

  try {
    if (!row.about_raw?.trim()) {
      row.about_raw = await fetchAboutFromR2(row.slug);
    }
    const first = await callMessages(
      apiKey,
      buildUserPayload(row, row.about_raw ?? "")
    );
    addUsage(usage, first.usage);

    let payload: GeneratedAboutPayload;
    const rawText = first.text;
    try {
      payload = preparePayloadForValidation(
        parseModelJson(rawText, slug),
        row.name,
        row.city
      );
    } catch (firstParseErr) {
      const fix = await callMessages(
        apiKey,
        buildUserPayload(
          row,
          row.about_raw ?? "",
          "Return ONLY one complete JSON object matching the schema—no markdown fences. Target ~1000 words, 3–4 sections."
        )
      );
      addUsage(usage, fix.usage);
      try {
        payload = preparePayloadForValidation(
          parseModelJson(fix.text, slug),
          row.name,
          row.city
        );
      } catch (e) {
        const errMsg = String(e);
        logVerboseResult(
          verbose,
          slug,
          row.name,
          0,
          `FAIL — JSON parse: ${errMsg}`,
          usage
        );
        fs.appendFileSync(failedLog, `${slug}: JSON parse ${errMsg}\n`);
        writeDraftRecord(row, {
          quality: { pass: false, status: "FAIL", reasons: [`JSON parse: ${errMsg}`] },
          error: errMsg,
        });
        return {
          kind: "failed",
          slug,
          usage,
          status: "FAIL",
          words: 0,
          reasons: [`JSON parse: ${errMsg}`],
        };
      }
    }

    const menu = parseMenuData(row.menu_data);
    const aboutRaw = row.about_raw ?? null;
    payload = preparePayloadForValidation(payload, row.name, row.city);
    let check = validateGeneratedAbout({
      payload,
      menuData: menu,
      aboutRaw,
      restaurantName: row.name,
      city: row.city,
    });

    let retryParseFailed = false;
    if (!check.ok) {
      const wordCount = aboutContentWordCount({
        intro: payload.intro,
        sections: payload.sections,
      });
      const wordHint = wordCountRetryHint(payload, wordCount);
      const retryUser = buildCorrectionUserMessage(
        payload,
        check.reasons,
        wordHint
      );
      const retry = await callMessages(apiKey, retryUser);
      addUsage(usage, retry.usage);
      try {
        payload = preparePayloadForValidation(
          parseModelJson(retry.text, slug),
          row.name,
          row.city
        );
        check = validateGeneratedAbout({
          payload,
          menuData: menu,
          aboutRaw,
          restaurantName: row.name,
          city: row.city,
        });
      } catch (e) {
        retryParseFailed = true;
        logRawModelResponse(slug, retry.text, "quality-retry-parse-failed");
        check = {
          ok: false,
          reasons: [
            ...check.reasons,
            `JSON parse on quality retry: ${String(e)}`,
          ],
        };
      }
    }

    const fields = payloadToDraftFields(payload);
    const fullText = [payload.intro, ...payload.sections.map((s) => s.body)].join(
      "\n"
    );

    let statusLabel: AboutDraftQualityStatus;
    if (check.ok) {
      statusLabel = "PASS";
    } else if (
      !retryParseFailed &&
      qualifiesForManualReview(payload)
    ) {
      statusLabel = "REVIEW";
    } else {
      statusLabel = "FAIL";
    }

    logVerboseResult(
      verbose,
      slug,
      row.name,
      fields.wordCount,
      statusLabel === "PASS"
        ? "PASS"
        : statusLabel === "REVIEW"
          ? `REVIEW — ${check.ok ? "" : check.reasons.join("; ")}`
          : `FAIL — ${check.reasons.join("; ")}`,
      usage
    );

    if (statusLabel === "FAIL") {
      fs.appendFileSync(
        failedLog,
        `${slug}: quality ${check.reasons.join("; ")}\n`
      );
      writeDraftRecord(row, {
        quality: { pass: false, status: "FAIL", reasons: check.reasons },
        ...fields,
      });
      return {
        kind: "failed",
        slug,
        usage,
        status: "FAIL",
        words: fields.wordCount,
        reasons: check.reasons,
      };
    }

    for (const prev of savedTexts) {
      if (sentenceOverlapRatio(fullText, prev.text) > 0.4) {
        fs.appendFileSync(
          failedLog,
          `${slug}: too similar to ${prev.slug}\n`
        );
        writeDraftRecord(row, {
          quality: {
            pass: false,
            status: "FAIL",
            reasons: [`too similar to ${prev.slug}`],
          },
          ...fields,
        });
        return {
          kind: "skipped",
          slug,
          usage,
          status: "SKIP",
          words: fields.wordCount,
          reasons: [`too similar to ${prev.slug}`],
        };
      }
    }

    if (statusLabel === "REVIEW") {
      writeDraftRecord(row, {
        quality: {
          pass: false,
          status: "REVIEW",
          reasons: check.ok ? [] : check.reasons,
        },
        ...fields,
      });
      return {
        kind: "review",
        slug,
        text: fullText,
        usage,
        status: "REVIEW",
        words: fields.wordCount,
        reasons: check.ok ? [] : check.reasons,
      };
    }

    writeDraftRecord(row, {
      quality: { pass: true, status: "PASS", reasons: [] },
      meta_title: fields.meta_title,
      meta_description: fields.meta_description,
      intro: fields.intro,
      sections: fields.sections,
      wordCount: fields.wordCount,
    });

    return {
      kind: "generated",
      slug,
      text: fullText,
      usage,
      status: "PASS",
      words: fields.wordCount,
      reasons: [],
    };
  } catch (e) {
    const errMsg = String(e);
    if (e instanceof BillingExhaustedError) billingAbort = true;
    logVerboseResult(verbose, slug, row.name, 0, `FAIL — ${errMsg}`, usage);
    fs.appendFileSync(failedLog, `${slug}: ${errMsg}\n`);
    writeDraftRecord(row, {
      quality: { pass: false, status: "FAIL", reasons: [errMsg] },
      error: errMsg,
    });
    return {
      kind: "failed",
      slug,
      usage,
      status: "FAIL",
      words: 0,
      reasons: [errMsg],
    };
  }
}

async function main() {
  const apiKey =
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.CLAUDE_API_KEY?.trim();
  if (!apiKey && !DRY_RUN) {
    console.error("Missing ANTHROPIC_API_KEY or CLAUDE_API_KEY");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const all = await fetchRestaurants(supabase);
  let targets = all.filter(eligible);
  if (SLUGS) {
    const set = new Set(SLUGS);
    targets = all.filter((r) => set.has(r.slug) && eligible(r));
  } else if (SAMPLE) {
    targets = await pickSampleRows(all);
  } else if (BATCH_ABOUT) {
    targets = all.filter(batchScopeEligible);
  }

  if (!FORCE && !DRAFT_MODE) {
    targets = targets.filter(
      (r) => !hasPassDraft(r.slug) && !isPublishedOnSite(r)
    );
  }

  console.log(`Model: ${MODEL} (effort=medium, max_tokens=${MAX_TOKENS}, parallel=${PARALLEL})`);
  console.log(`Targets this run: ${targets.length}`);
  if (BATCH_ABOUT && !SLUGS) {
    const batchTotal = all.filter(batchScopeEligible).length;
    const passDrafts = all.filter(
      (r) => batchScopeEligible(r) && hasPassDraft(r.slug)
    ).length;
    const publishedN = all.filter(
      (r) => batchScopeEligible(r) && isPublishedOnSite(r)
    ).length;
    console.log(
      `Batch scope: ${batchTotal} restaurants (R2 photos + restaurant_menu); ${passDrafts} PASS drafts skipped; ${publishedN} already published`
    );
    const estPer = 0.008;
    console.log(
      `Estimated cost this run: ~$${(targets.length * estPer).toFixed(2)} (${targets.length} × ~$${estPer})`
    );
  }
  if (targets.length === 0) return;

  if (DRY_RUN) {
    for (const r of targets) {
      console.log(`- ${r.slug}: r2=${hasR2Photos(r)} menu=${hasRestaurantMenu(r)}`);
    }
    return;
  }

  fs.writeFileSync(failedLog, "");
  console.log("Draft-only mode: writing scripts/drafts/[slug].json (no Supabase updates)");

  const verbose = Boolean(SLUGS && targets.length <= 8);
  const limit = pLimit(PARALLEL);
  const savedTexts: { slug: string; text: string }[] = [];
  const savedLock = { chain: Promise.resolve() as Promise<void> };

  let generated = 0;
  let reviewCount = 0;
  let failedCount = 0;
  let skipped = 0;
  const totalUsage = emptyUsage();
  const failureCounts = new Map<string, number>();
  const previewPool: { slug: string; status: string }[] = [];
  let done = 0;
  const total = targets.length;
  const startedAt = Date.now();
  const progressLock = { chain: Promise.resolve() as Promise<void> };

  const outcomes = await Promise.all(
    targets.map((row) =>
      limit(async () => {
        if (billingAbort) {
          return {
            kind: "failed" as const,
            slug: row.slug,
            usage: emptyUsage(),
            status: "FAIL" as const,
            words: 0,
            reasons: ["skipped: billing abort"],
          };
        }
        const outcome = await processRestaurant(
          apiKey!,
          row,
          savedTexts,
          verbose
        );
        await savedLock.chain;
        let release!: () => void;
        savedLock.chain = new Promise<void>((r) => {
          release = r;
        });
        if (outcome.kind === "generated" || outcome.kind === "review") {
          savedTexts.push({ slug: outcome.slug, text: outcome.text });
        }
        release();

        await progressLock.chain;
        let releaseP!: () => void;
        progressLock.chain = new Promise<void>((r) => {
          releaseP = r;
        });
        done++;
        const status =
          outcome.status === "SKIP" ? "SKIP" : outcome.status;
        if (!verbose) {
          console.log(
            `[${done}/${total}] ${outcome.slug} → ${status} (${outcome.words}w, $${estimateUsd(outcome.usage).toFixed(4)})`
          );
        }
        if (status === "PASS" || status === "REVIEW") {
          previewPool.push({ slug: outcome.slug, status });
        }
        for (const reason of outcome.reasons) {
          const key = reason.replace(/^[^:]+:\s*/, "").slice(0, 80);
          failureCounts.set(key, (failureCounts.get(key) ?? 0) + 1);
        }
        releaseP();
        return outcome;
      })
    )
  );

  for (const outcome of outcomes) {
    addUsage(totalUsage, outcome.usage);
    if (outcome.kind === "generated") generated++;
    else if (outcome.kind === "review") reviewCount++;
    else if (outcome.kind === "skipped") skipped++;
    else failedCount++;
  }

  const summary = {
    model: MODEL,
    generated,
    review: reviewCount,
    failed: failedCount,
    skipped,
    targets: targets.length,
    inputTokens: totalUsage.input_tokens,
    outputTokens: totalUsage.output_tokens,
    cacheReadInputTokens: totalUsage.cache_read_input_tokens,
    estimatedUsd: Number(estimateUsd(totalUsage).toFixed(4)),
  };
  fs.writeFileSync(
    path.join(logsDir, "content-generation-summary.json"),
    JSON.stringify(summary, null, 2)
  );
  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  console.log("\nSummary:", summary);
  console.log(`Time: ${elapsedSec}s (${(elapsedSec / 60).toFixed(1)} min)`);

  const topFailures = [...failureCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (topFailures.length > 0) {
    console.log("\nTop failure reasons:");
    for (const [reason, n] of topFailures) {
      console.log(`  ${n}× ${reason}`);
    }
  }

  const pickRandom = <T,>(arr: T[], n: number): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0 && copy.length > n; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  };
  const passPool = previewPool.filter((p) => p.status === "PASS");
  const reviewPool = previewPool.filter((p) => p.status === "REVIEW");
  const sample = [
    ...pickRandom(passPool, 5),
    ...pickRandom(reviewPool, 5),
  ].slice(0, 10);
  if (sample.length > 0) {
    console.log("\nSample preview URLs (PREVIEW_DRAFTS=true):");
    for (const p of sample) {
      console.log(`  [${p.status}] http://localhost:3000/${p.slug}`);
    }
  }

  console.log("\nPublish PASS drafts:  npm run publish:about -- --all");
  console.log("Publish REVIEW drafts: npm run publish:about -- --review");

  if (BATCH_ABOUT && billingAbort) {
    console.error("\n*** Batch stopped: Anthropic billing/credit error ***");
  }

  if (BATCH_ABOUT && !SLUGS) {
    console.log("\nPost-batch: re-check REVIEW/FAIL drafts…");
    try {
      execSync("npx tsx scripts/analyze-repair-fail-drafts.ts", {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (e) {
      console.warn("Re-check failed:", e);
    }
    console.log("\nPost-batch: publish new PASS drafts…");
    try {
      execSync("npm run publish:about -- --all", {
        stdio: "inherit",
        cwd: process.cwd(),
        env: process.env,
      });
    } catch (e) {
      console.warn("Publish failed:", e);
    }
    const site =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://halalresmenu.com";
    const liveSamples = pickRandom(
      previewPool.filter((p) => p.status === "PASS"),
      5
    );
    if (liveSamples.length > 0) {
      console.log("\nLive URLs (sample):");
      for (const p of liveSamples) {
        console.log(`  ${site}/${p.slug}`);
      }
    }
  }

  if (!SLUGS || targets.length > 8) {
    try {
      execSync("npx tsx scripts/build-about-review-html.ts", {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (e) {
      console.warn("Could not rebuild review.html:", e);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
