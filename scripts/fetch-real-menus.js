/**
 * Fetches real menu data from restaurant websites using Claude extraction.
 *
 * Usage:
 *   node scripts/fetch-real-menus.js --limit 50 --dry-run
 *   node scripts/fetch-real-menus.js --limit 50 --city london
 *   node scripts/fetch-real-menus.js --limit 100
 *   node scripts/fetch-real-menus.js --ai-only --limit 100
 *   node scripts/fetch-real-menus.js --all --limit 100
 *
 * Targets:
 *   --ai-only  → menu_data.source = 'ai_generated'
 *   (default)  → website set, menu_data IS NULL
 *   --all      → no menu OR ai_generated (skips real website menus)
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAUDE_API_KEY (.env.local)
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync, mkdirSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const ANTHROPIC_KEY =
  process.env.CLAUDE_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim();

const BATCH_SIZE = 10;
const DELAY_BETWEEN_FETCHES = 2000;
const DELAY_BETWEEN_BATCHES = 5000;
const FETCH_TIMEOUT = 15000;
const MAX_TEXT_LENGTH = 50000;
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const PAGE = 1000;

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(`--${flag}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : null;
};
const hasFlag = (flag) => args.includes(`--${flag}`);

const LIMIT = parseInt(getArg("limit") || "50", 10);
const CITY = getArg("city");
const DRY_RUN = hasFlag("dry-run");
const AI_ONLY = hasFlag("ai-only");
const TARGET_ALL = hasFlag("all");

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CLAUDE_API_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function matchesCity(city) {
  if (!CITY) return true;
  return String(city || "")
    .toLowerCase()
    .includes(CITY.toLowerCase());
}

function isTargetMenu(menuData) {
  if (!menuData) return true;
  return menuData.source === "ai_generated";
}

function hasPricePatterns(text) {
  const patterns = [
    /£\s?\d+/,
    /\d+\.\d{2}/,
    /GBP\s?\d+/i,
    /price/i,
    /from\s+\d+\.\d{2}/i,
  ];

  let matches = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) matches++;
  }

  return matches >= 2;
}

function isUselessUrl(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  const skipDomains = [
    "facebook.com",
    "fb.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "tiktok.com",
    "just-eat.co.uk",
    "justeat.co.uk",
    "deliveroo.co.uk",
    "deliveroo.com",
    "ubereats.com",
    "tripadvisor.co.uk",
    "tripadvisor.com",
    "yelp.com",
    "yelp.co.uk",
    "google.com/maps",
    "goo.gl",
    "linkedin.com",
    "youtube.com",
  ];
  return skipDomains.some((d) => lower.includes(d));
}

async function fetchCandidateRows() {
  const rows = [];
  let from = 0;

  while (rows.length < LIMIT * 3) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, slug, name, website, cuisine_type, city, menu_data")
      .not("website", "is", null)
      .neq("website", "")
      .range(from, from + PAGE - 1);

    if (error) {
      console.error("Supabase error:", error.message);
      process.exit(1);
    }
    if (!data?.length) break;

    for (const row of data) {
      if (!matchesCity(row.city)) continue;
      if (AI_ONLY) {
        if (row.menu_data?.source === "ai_generated") rows.push(row);
      } else if (TARGET_ALL) {
        if (isTargetMenu(row.menu_data)) rows.push(row);
      } else if (row.menu_data == null) {
        rows.push(row);
      }
      if (rows.length >= LIMIT) return rows.slice(0, LIMIT);
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return rows.slice(0, LIMIT);
}

async function fetchWebsiteText(url) {
  try {
    if (!url.startsWith("http")) url = `https://${url}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HalalResMenu/1.0; +https://halalresmenu.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain")
    ) {
      throw new Error(`Not HTML: ${contentType}`);
    }

    let html = await res.text();
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (html.length > MAX_TEXT_LENGTH) {
      html = `${html.substring(0, MAX_TEXT_LENGTH)}\n[TRUNCATED]`;
    }

    return { ok: true, text: html, length: html.length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function fetchMenuPages(baseUrl) {
  if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
  baseUrl = baseUrl.replace(/\/+$/, "");

  const menuPaths = [
    "",
    "/menu",
    "/food-menu",
    "/our-menu",
    "/menus",
    "/food",
    "/order",
    "/takeaway-menu",
  ];

  let combinedText = "";
  let fetchedAny = false;
  let triedCount = 0;

  for (const path of menuPaths) {
    const url = baseUrl + path;
    triedCount++;

    const result = await fetchWebsiteText(url);

    if (result.ok && result.text && result.text.length > 200) {
      fetchedAny = true;
      combinedText += `\n\n--- PAGE: ${url} ---\n\n${result.text}`;

      if (hasPricePatterns(result.text) && combinedText.length > 2000) {
        break;
      }
    }

    if (triedCount < menuPaths.length) {
      await sleep(500);
    }
  }

  if (combinedText.length > MAX_TEXT_LENGTH) {
    combinedText = `${combinedText.substring(0, MAX_TEXT_LENGTH)}\n[TRUNCATED]`;
  }

  return {
    ok: fetchedAny,
    text: combinedText,
    length: combinedText.length,
    error: fetchedAny ? null : "all_pages_failed",
  };
}

async function extractMenu(name, cuisine, websiteText) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Extract the restaurant menu from this website text.

Restaurant: "${name}"
Cuisine: ${cuisine || "not specified"}

STRICT RULES:
- ONLY extract items with explicit prices shown on the page
- If you cannot find any menu items with prices, respond: {"found": false}
- Do NOT invent, guess, or estimate any item names, descriptions, or prices
- Do NOT add items based on what this type of restaurant "would typically serve"
- Prices must be exactly as shown (numbers only, no currency symbols)
- Keep descriptions brief — only use text from the website itself
- If item has no description on the site, use null for description

Respond with ONLY this JSON (no markdown, no backticks, no explanation):

{
  "found": true,
  "currency": "GBP",
  "categories": [
    {
      "name": "Section Name",
      "items": [
        {
          "name": "Dish Name",
          "description": "Brief description from the website or null",
          "price": 12.50
        }
      ]
    }
  ]
}

WEBSITE TEXT:
${websiteText}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = (json.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const cleaned = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return { found: false, error: "json_parse_failed" };
  }
}

function validateMenu(menuData) {
  if (!menuData.found) return { valid: false, reason: "not_found" };
  if (!Array.isArray(menuData.categories))
    return { valid: false, reason: "no_categories" };
  if (menuData.categories.length === 0)
    return { valid: false, reason: "empty_categories" };

  let totalItems = 0;
  for (const cat of menuData.categories) {
    if (!cat.name || !Array.isArray(cat.items))
      return { valid: false, reason: "malformed_category" };
    for (const item of cat.items) {
      if (!item.name || typeof item.price !== "number" || item.price <= 0) {
        return { valid: false, reason: `invalid_item: ${item.name}` };
      }
      if (item.price > 500) {
        return {
          valid: false,
          reason: `suspicious_price: ${item.name} = ${item.price}`,
        };
      }
      totalItems++;
    }
  }

  if (totalItems < 1)
    return { valid: false, reason: `too_few_items: ${totalItems}` };

  return {
    valid: true,
    totalItems,
    categories: menuData.categories.length,
  };
}

async function saveMenu(restaurantId, menuData) {
  const payload = {
    source: "restaurant_website",
    extracted_at: new Date().toISOString().split("T")[0],
    categories: menuData.categories,
    currency: menuData.currency || "GBP",
  };

  const { error } = await supabase
    .from("restaurants")
    .update({
      menu_data: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", restaurantId);

  return !error;
}

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   HalalResMenu — Real Menu Fetcher              ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(
    `  Mode:     ${AI_ONLY ? "Replace AI menus" : TARGET_ALL ? "All (no-menu + AI)" : "No-menu only"}`
  );
  console.log(`  Limit:    ${LIMIT}`);
  console.log(`  City:     ${CITY || "all"}`);
  console.log(`  Dry run:  ${DRY_RUN}`);
  console.log("");

  const restaurants = await fetchCandidateRows();
  console.log(`  Found ${restaurants.length} restaurants to process\n`);
  if (!restaurants.length) return;

  const stats = { success: 0, no_menu: 0, fetch_fail: 0, invalid: 0, error: 0 };
  const log = [];

  for (let i = 0; i < restaurants.length; i += BATCH_SIZE) {
    const batch = restaurants.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(restaurants.length / BATCH_SIZE);

    console.log(`─── Batch ${batchNum}/${totalBatches} ───────────────────────────────`);

    for (const r of batch) {
      console.log(`\n  ${r.name} (${r.city})`);
      console.log(`  ${r.website}`);

      if (isUselessUrl(r.website)) {
        console.log("  ⚠ Skipping social/aggregator URL");
        stats.fetch_fail++;
        log.push({ slug: r.slug, status: "skipped_aggregator" });
        continue;
      }

      const page = await fetchMenuPages(r.website);
      if (!page.ok) {
        console.log(`  ✗ Fetch failed: ${page.error}`);
        stats.fetch_fail++;
        log.push({ slug: r.slug, status: "fetch_fail", error: page.error });
        await sleep(DELAY_BETWEEN_FETCHES);
        continue;
      }
      if (page.length < 200) {
        console.log(`  ✗ Too little content (${page.length} chars)`);
        stats.fetch_fail++;
        log.push({ slug: r.slug, status: "no_content" });
        await sleep(DELAY_BETWEEN_FETCHES);
        continue;
      }
      console.log(`  ✓ Fetched ${page.length} chars`);

      if (!hasPricePatterns(page.text)) {
        console.log("  ⚠ No price patterns found — skipping Claude call");
        stats.no_menu++;
        log.push({ slug: r.slug, status: "no_prices" });
        await sleep(DELAY_BETWEEN_FETCHES);
        continue;
      }

      let menuData;
      try {
        menuData = await extractMenu(r.name, r.cuisine_type, page.text);
      } catch (err) {
        console.log(`  ✗ Claude error: ${err.message}`);
        stats.error++;
        log.push({ slug: r.slug, status: "claude_error", error: err.message });
        await sleep(DELAY_BETWEEN_FETCHES);
        continue;
      }

      if (!menuData.found) {
        console.log("  ⚠ No menu with prices found on website");
        stats.no_menu++;
        log.push({ slug: r.slug, status: "no_menu" });
        await sleep(DELAY_BETWEEN_FETCHES);
        continue;
      }

      const check = validateMenu(menuData);
      if (!check.valid) {
        console.log(`  ✗ Validation failed: ${check.reason}`);
        stats.invalid++;
        log.push({ slug: r.slug, status: "invalid", reason: check.reason });
        await sleep(DELAY_BETWEEN_FETCHES);
        continue;
      }

      console.log(`  ✓ ${check.totalItems} items in ${check.categories} categories`);

      if (DRY_RUN) {
        console.log("  [DRY RUN] Would save — sample:");
        const sample = menuData.categories[0]?.items?.slice(0, 2);
        console.log(`  ${JSON.stringify(sample)}`);
        stats.success++;
        log.push({ slug: r.slug, status: "dry_run", items: check.totalItems });
      } else {
        const saved = await saveMenu(r.id, menuData);
        if (saved) {
          console.log("  ✓ Saved to Supabase (source: restaurant_website)");
          stats.success++;
          log.push({ slug: r.slug, status: "saved", items: check.totalItems });
        } else {
          console.log("  ✗ Save failed");
          stats.error++;
          log.push({ slug: r.slug, status: "save_error" });
        }
      }

      await sleep(DELAY_BETWEEN_FETCHES);
    }

    if (i + BATCH_SIZE < restaurants.length) {
      console.log(`\n  Pausing ${DELAY_BETWEEN_BATCHES / 1000}s...\n`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   RESULTS                                       ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║   ✓ Menus extracted:  ${String(stats.success).padStart(5)}                    ║`);
  console.log(`║   ⚠ No menu on site:  ${String(stats.no_menu).padStart(5)}                    ║`);
  console.log(`║   ✗ Fetch failed:     ${String(stats.fetch_fail).padStart(5)}                    ║`);
  console.log(`║   ✗ Invalid data:     ${String(stats.invalid).padStart(5)}                    ║`);
  console.log(`║   ✗ Other errors:     ${String(stats.error).padStart(5)}                    ║`);
  console.log("╚══════════════════════════════════════════════════╝");

  try {
    mkdirSync(resolve(process.cwd(), "scripts/logs"), { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const path = resolve(process.cwd(), `scripts/logs/menu-fetch-${ts}.json`);
    writeFileSync(path, JSON.stringify({ stats, log }, null, 2));
    console.log(`\nLog: ${path}`);
  } catch {
    // ignore
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
