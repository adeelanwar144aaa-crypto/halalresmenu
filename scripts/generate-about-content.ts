/**
 * Generate restaurant about_content via Anthropic Message Batches API.
 *
 * Usage:
 *   npx tsx scripts/generate-about-content.ts --dry-run --sample
 *   npx tsx scripts/generate-about-content.ts --sample
 *   npx tsx scripts/generate-about-content.ts --slugs=a,b,c
 *   npx tsx scripts/generate-about-content.ts --force
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { parseMenuData } from "@/lib/menu-data";
import type { GeneratedAboutPayload } from "@/lib/about-content-types";
import {
  sentenceOverlapRatio,
  validateGeneratedAbout,
} from "@/lib/about-content-quality";
import { normalizeOpeningHours } from "@/lib/opening-hours-display";
import type { Restaurant } from "@/types/restaurant";

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

const SYSTEM_PROMPT = `You write restaurant guide pages for halalresmenu.com, a UK directory of halal restaurants. Write for real people deciding where to eat.

Use ONLY facts in the provided ABOUT text, MENU and DETAILS. Never invent anything: no owners, history, awards, reviews, ratings, opening years, parking, delivery apps, atmosphere details, or dishes not in the menu.
Halal: only say "halal certified" or name a certifier if ABOUT says so. Otherwise say the restaurant is listed as halal and suggest customers confirm with the restaurant.

Length: aim for about 1000 words, but if the source material is thin, write less (minimum 500). Never pad or repeat.

Structure: an intro paragraph (2–3 sentences, no heading), then 3–4 sections with H2 headings matching what searchers want to know.
Choose from and adapt, using the restaurant name and city naturally:
- About [Name] in [City] (what it is, cuisine, location/area)
- What to order at [Name] (specific dishes and categories from the menu, with real £ prices)
- [Name] menu and prices (price range, value, vegetarian options if any)
- Halal status, location and visiting [Name] (halal info, address, hours/phone only if provided)
Vary heading wording and section order between restaurants; don't use an identical template every time.

Style: plain, specific, UK English, £ prices. Mention 6–12 real menu items by exact name. No clichés: never use "nestled", "hidden gem", "culinary journey", "tantalise", "look no further", "whether you're", "mouth-watering", "a feast for the senses", "elevate". No exclamation marks. No FAQ section. No calls to action like "book now".

Return ONLY valid JSON:
{
  "meta_title": "<= 60 chars, name + cuisine/halal + city",
  "meta_description": "120–155 chars, specific, mentions 1–2 dishes",
  "intro": "...",
  "sections": [{ "heading": "...", "body": "paragraphs separated by \\n\\n" }]
}`;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const SAMPLE = args.includes("--sample");
const slugArg = args.find((a) => a.startsWith("--slugs="));
const SLUGS = slugArg
  ? slugArg
      .slice("--slugs=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

const logsDir = path.resolve(process.cwd(), "scripts/logs");
fs.mkdirSync(logsDir, { recursive: true });
const failedLog = path.join(logsDir, "content-failed.log");
const BATCH_CHUNK = 50;
const R2_PUBLIC =
  process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ||
  "https://pub-74c1c686fc79435981404eb4c207734f.r2.dev";

const aboutFromR2 = new Map<string, string>();

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

function buildUserPayload(row: Restaurant, aboutRaw: string): string {
  const menu = parseMenuData(row.menu_data);
  const hours = normalizeOpeningHours(row.opening_hours);
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
      halal_status: row.halal_status,
      halal_certifier: row.halal_certifier,
    },
    null,
    2
  );
}

type SaveMode = "columns" | "legacy";

async function detectSaveMode(
  supabase: ReturnType<typeof createClient>
): Promise<SaveMode> {
  const probe = await supabase.from("restaurants").select("about_content").limit(1);
  if (probe.error && /about_content/i.test(probe.error.message ?? "")) {
    return "legacy";
  }
  return "columns";
}

async function saveGenerated(
  supabase: ReturnType<typeof createClient>,
  mode: SaveMode,
  row: Restaurant,
  payload: GeneratedAboutPayload,
  now: string
): Promise<string | null> {
  const guide = { intro: payload.intro, sections: payload.sections };
  if (mode === "columns") {
    const { error } = await supabase
      .from("restaurants")
      .update({
        about_content: guide,
        seo_title: payload.meta_title,
        seo_meta_description: payload.meta_description,
        content_generated_at: now,
        updated_at: now,
      })
      .eq("id", row.id);
    return error?.message ?? null;
  }

  const prev =
    row.seo_content && typeof row.seo_content === "object"
      ? (row.seo_content as Record<string, unknown>)
      : {};
  const { error } = await supabase
    .from("restaurants")
    .update({
      meta_title: payload.meta_title,
      meta_description: payload.meta_description,
      seo_content: {
        ...prev,
        guide,
        content_generated_at: now,
      },
      updated_at: now,
    })
    .eq("id", row.id);
  return error?.message ?? null;
}

function hasExistingGuide(row: Restaurant): boolean {
  if (row.about_content && typeof row.about_content === "object") return true;
  const sc = row.seo_content;
  if (sc && typeof sc === "object") {
    const guide = (sc as Record<string, unknown>).guide;
    if (guide && typeof guide === "object") return true;
  }
  return false;
}

async function anthropicFetch(apiKey: string, pathname: string, init?: RequestInit) {
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
    throw new Error(`Anthropic ${pathname} ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

function parseModelJson(raw: string): GeneratedAboutPayload {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < 0) throw new Error("no JSON object in response");
  return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as GeneratedAboutPayload;
}

async function createBatch(
  apiKey: string,
  requests: { custom_id: string; user: string }[]
) {
  const body = {
    requests: requests.map((r) => ({
      custom_id: r.custom_id,
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: r.user }],
      },
    })),
  };
  return anthropicFetch(apiKey, "/v1/messages/batches", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function waitForBatch(apiKey: string, batchId: string) {
  for (let i = 0; i < 120; i++) {
    const batch = await anthropicFetch(apiKey, `/v1/messages/batches/${batchId}`);
    if (batch.processing_status === "ended") return batch;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("batch timeout");
}

async function fetchBatchResults(apiKey: string, batchId: string) {
  const res = await fetch(
    `https://api.anthropic.com/v1/messages/batches/${batchId}/results`,
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`batch results ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
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
  "id, slug, name, city, address, postcode, phone, cuisine_type, opening_hours, about_raw, about_content, menu_data, halal_status, halal_certifier, description, seo_content, meta_title, meta_description";
const RESTAURANT_SELECT_LEGACY =
  "id, slug, name, city, address, postcode, phone, cuisine_type, opening_hours, menu_data, halal_status, halal_certifier, description, seo_content, meta_title, meta_description";

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
  if (!FORCE) {
    targets = targets.filter((r) => !hasExistingGuide(r));
  }
  if (SLUGS) {
    const set = new Set(SLUGS);
    targets = all.filter((r) => set.has(r.slug));
  } else if (SAMPLE) {
    targets = await pickSampleRows(all);
  }

  console.log(`Eligible targets: ${targets.length}`);
  if (targets.length === 0) return;

  if (DRY_RUN) {
    for (const r of targets) {
      console.log(
        `- ${r.slug}: about ${r.about_raw?.length ?? 0} chars, menu ${parseMenuData(r.menu_data)?.categories?.length ?? 0} cats`
      );
    }
    return;
  }

  fs.writeFileSync(failedLog, "");
  const saveMode = await detectSaveMode(supabase);
  console.log("Save mode:", saveMode);

  for (const row of targets) {
    if (!row.about_raw?.trim()) {
      row.about_raw = await fetchAboutFromR2(row.slug);
    }
  }

  const bySlug = new Map(targets.map((r) => [r.slug, r]));
  const savedTexts: { slug: string; text: string }[] = [];
  let generated = 0;
  let failed = 0;
  let skipped = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (let offset = 0; offset < targets.length; offset += BATCH_CHUNK) {
    const chunk = targets.slice(offset, offset + BATCH_CHUNK);
    console.log(
      `\nBatch chunk ${Math.floor(offset / BATCH_CHUNK) + 1}/${Math.ceil(targets.length / BATCH_CHUNK)} (${chunk.length} restaurants)`
    );

    const batch = await createBatch(
      apiKey!,
      chunk.map((r) => ({
        custom_id: r.slug,
        user: buildUserPayload(r, r.about_raw ?? ""),
      }))
    );
    console.log("Batch id:", batch.id);
    await waitForBatch(apiKey!, batch.id);
    const results = await fetchBatchResults(apiKey!, batch.id);

    for (const line of results) {
    const slug = line.custom_id as string;
    const row = bySlug.get(slug);
    if (!row) continue;

    if (line.result?.type === "errored") {
      failed++;
      fs.appendFileSync(failedLog, `${slug}: API error ${JSON.stringify(line.result.error)}\n`);
      continue;
    }

    const usage = line.result?.message?.usage;
    if (usage) {
      inputTokens += usage.input_tokens ?? 0;
      outputTokens += usage.output_tokens ?? 0;
    }

    const text =
      line.result?.message?.content
        ?.map((b: { text?: string }) => b.text || "")
        .join("") || "";

    let payload: GeneratedAboutPayload;
    try {
      payload = parseModelJson(text);
    } catch (e) {
      failed++;
      fs.appendFileSync(failedLog, `${slug}: JSON parse ${String(e)}\n`);
      continue;
    }

    const menu = parseMenuData(row.menu_data);
    let check = validateGeneratedAbout({
      payload,
      menuData: menu,
      aboutRaw: row.about_raw ?? null,
      restaurantName: row.name,
      city: row.city,
    });

    if (!check.ok) {
      const retryBatch = await createBatch(apiKey!, [
        {
          custom_id: slug,
          user:
            buildUserPayload(row, row.about_raw ?? "") +
            "\n\nFix these issues: " +
            check.reasons.join("; "),
        },
      ]);
      await waitForBatch(apiKey!, retryBatch.id);
      const retryResults = await fetchBatchResults(apiKey!, retryBatch.id);
      const retryLine = retryResults[0];
      try {
        const retryText =
          retryLine.result?.message?.content
            ?.map((b: { text?: string }) => b.text || "")
            .join("") || "";
        payload = parseModelJson(retryText);
        check = validateGeneratedAbout({
          payload,
          menuData: menu,
          aboutRaw: row.about_raw ?? null,
          restaurantName: row.name,
          city: row.city,
        });
      } catch (e) {
        failed++;
        fs.appendFileSync(failedLog, `${slug}: retry failed ${String(e)}\n`);
        continue;
      }
    }

    if (!check.ok) {
      failed++;
      fs.appendFileSync(
        failedLog,
        `${slug}: quality ${check.reasons.join("; ")}\n`
      );
      continue;
    }

    const fullText = [payload.intro, ...payload.sections.map((s) => s.body)].join("\n");
    let tooSimilar = false;
    for (const prev of savedTexts) {
      if (sentenceOverlapRatio(fullText, prev.text) > 0.4) {
        failed++;
        fs.appendFileSync(
          failedLog,
          `${slug}: too similar to ${prev.slug}\n`
        );
        skipped++;
        tooSimilar = true;
        break;
      }
    }
    if (tooSimilar) continue;

    const now = new Date().toISOString();
    const dbErr = await saveGenerated(supabase, saveMode, row, payload, now);
    if (dbErr) {
      failed++;
      fs.appendFileSync(failedLog, `${slug}: DB ${dbErr}\n`);
      continue;
    }

    generated++;
    savedTexts.push({ slug, text: fullText });
    if (SAMPLE || SLUGS || targets.length <= 8) {
      console.log("\n===", slug, "===\n");
      console.log(JSON.stringify(payload, null, 2));
      console.log(
        "\nWord count:",
        fullText.split(/\s+/).filter(Boolean).length,
        "checks: ok"
      );
    }
    }
  }

  const inputCost = (inputTokens / 1_000_000) * 0.8;
  const outputCost = (outputTokens / 1_000_000) * 4;
  const summary = {
    generated,
    failed,
    skipped,
    targets: targets.length,
    inputTokens,
    outputTokens,
    estimatedUsd: Number((inputCost + outputCost).toFixed(2)),
  };
  fs.writeFileSync(
    path.join(logsDir, "content-generation-summary.json"),
    JSON.stringify(summary, null, 2)
  );
  console.log("\nSummary:", summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
