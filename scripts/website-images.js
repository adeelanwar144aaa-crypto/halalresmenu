/**
 * Scrape restaurant website images → Supabase Storage → restaurants.photos
 * Run: npm run website-images
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Requires public bucket: restaurant-photos
 */

const { createClient } = require("@supabase/supabase-js");
const cheerio = require("cheerio");
const fetch = require("node-fetch");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const REQUEST_DELAY_MS = 1000;
const RESTAURANT_PAGE_SIZE = 100;
const FETCH_TIMEOUT_MS = 30000;
const MIN_IMAGE_PX = 200;
const STORAGE_BUCKET = "restaurant-photos";

const SKIP_URL_PATTERN =
  /logo|icon|favicon|sprite|avatar|badge|pixel|tracking|spacer|1x1|arrow|button|social|facebook|twitter|instagram|youtube|linkedin|pinterest|whatsapp|svg|\.gif(\?|$)|data:image/i;

const GOOD_HINT_PATTERN =
  /hero|banner|gallery|food|dish|meal|interior|restaurant|slide|carousel|featured|main|cover|dining|menu-photo/i;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hasGooglePhotos(photos) {
  if (photos == null) return false;
  const text =
    typeof photos === "string" ? photos : JSON.stringify(photos);
  return text.toLowerCase().includes("googleapis");
}

function sanitizeSlug(slug, fallbackId) {
  const base = String(slug || fallbackId || "restaurant")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "restaurant";
}

function normalizeWebsiteUrl(website) {
  const raw = String(website || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function shouldSkipImageUrl(url) {
  if (!url) return true;
  return SKIP_URL_PATTERN.test(url);
}

function parseDimension(value) {
  if (value == null || value === "") return null;
  const n = parseInt(String(value).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveUrl(baseUrl, src) {
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  }
  if (!serviceKey || serviceKey.includes("your-")) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  console.log("Using SUPABASE_SERVICE_ROLE_KEY for DB + storage writes.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function fetchTargetRestaurants(supabase) {
  const all = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, website, photos")
      .not("website", "is", null)
      .order("name", { ascending: true })
      .range(offset, offset + RESTAURANT_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`restaurants fetch: ${error.message}`);
    }

    if (!data?.length) break;

    for (const row of data) {
      if (row.website?.trim() && hasGooglePhotos(row.photos)) {
        all.push(row);
      }
    }

    if (data.length < RESTAURANT_PAGE_SIZE) break;
    offset += RESTAURANT_PAGE_SIZE;
  }

  return all;
}

/**
 * @param {string} pageUrl
 * @param {string} html
 */
function findImageUrlFromHtml(pageUrl, html) {
  const $ = cheerio.load(html);

  const ogSelectors = [
    'meta[property="og:image"]',
    'meta[property="og:image:url"]',
    'meta[name="og:image"]',
    'meta[property="og:image:secure_url"]',
  ];

  for (const sel of ogSelectors) {
    const content = $(sel).attr("content")?.trim();
    if (!content) continue;
    const url = resolveUrl(pageUrl, content);
    if (url && isHttpUrl(url) && !shouldSkipImageUrl(url)) {
      return url;
    }
  }

  const candidates = [];

  $("img").each((_, el) => {
    const $el = $(el);
    const src =
      $el.attr("src")?.trim() ||
      $el.attr("data-src")?.trim() ||
      $el.attr("data-lazy-src")?.trim() ||
      $el.attr("data-original")?.trim();

    if (!src) return;

    const url = resolveUrl(pageUrl, src);
    if (!url || !isHttpUrl(url) || shouldSkipImageUrl(url)) return;

    const width = parseDimension($el.attr("width"));
    const height = parseDimension($el.attr("height"));
    const hint = `${$el.attr("class") || ""} ${$el.attr("id") || ""} ${$el.attr("alt") || ""}`;

    if (width != null && height != null) {
      if (width >= MIN_IMAGE_PX && height >= MIN_IMAGE_PX) {
        candidates.push({ url, score: width * height });
      }
      return;
    }

    if (
      (width != null && width >= MIN_IMAGE_PX) ||
      (height != null && height >= MIN_IMAGE_PX)
    ) {
      const w = width ?? MIN_IMAGE_PX;
      const h = height ?? MIN_IMAGE_PX;
      candidates.push({ url, score: w * h });
      return;
    }

    if (GOOD_HINT_PATTERN.test(hint)) {
      candidates.push({ url, score: MIN_IMAGE_PX * MIN_IMAGE_PX });
    }
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.url ?? null;
}

/**
 * @param {string} websiteUrl
 */
async function fetchWebsiteHtml(websiteUrl) {
  const res = await fetch(websiteUrl, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; HalalResMenuBot/1.0; +https://halalresmenu.com)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    timeout: FETCH_TIMEOUT_MS,
  });

  if (!res.ok) {
    throw new Error(`website HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error(`unexpected content-type: ${contentType.slice(0, 80)}`);
  }

  return res.text();
}

/**
 * @param {string} imageUrl
 */
async function downloadImage(imageUrl) {
  const res = await fetch(imageUrl, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; HalalResMenuBot/1.0; +https://halalresmenu.com)",
      Accept: "image/*,*/*",
    },
    redirect: "follow",
    timeout: FETCH_TIMEOUT_MS,
  });

  if (!res.ok) {
    throw new Error(`image download HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error(`not an image: ${contentType.slice(0, 60)}`);
  }

  const buffer = Buffer.from(await res.buffer());
  if (buffer.length < 2048) {
    throw new Error("image too small (< 2KB)");
  }

  return { buffer, contentType };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} slug
 * @param {{ buffer: Buffer; contentType: string }} image
 */
async function uploadToStorage(supabase, slug, image) {
  const storagePath = `restaurant-photos/${slug}/photo-1.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, image.buffer, {
      contentType: image.contentType.includes("png")
        ? "image/png"
        : "image/jpeg",
      upsert: true,
      cacheControl: "31536000",
    });

  if (uploadError) {
    throw new Error(`storage upload: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  if (!data?.publicUrl) {
    throw new Error("storage getPublicUrl returned no URL");
  }

  return data.publicUrl;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 * @param {string} publicUrl
 */
async function savePhotosColumn(supabase, id, publicUrl) {
  const { error } = await supabase
    .from("restaurants")
    .update({
      photos: [publicUrl],
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

async function main() {
  const supabase = createSupabaseClient();

  const summary = {
    completedAt: null,
    processed: 0,
    saved: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  console.log("Website image scrape → Supabase Storage…\n");

  const restaurants = await fetchTargetRestaurants(supabase);
  const total = restaurants.length;
  console.log(
    `Restaurants (website set + googleapis photos): ${total}\n`
  );

  if (total === 0) {
    summary.completedAt = new Date().toISOString();
    const summaryPath = resolve(process.cwd(), "summary-website-images.json");
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log("Nothing to process. Summary written.");
    return;
  }

  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i];
    const index = i + 1;
    summary.processed += 1;

    const slug = sanitizeSlug(restaurant.slug, restaurant.id);
    const websiteUrl = normalizeWebsiteUrl(restaurant.website);

    try {
      if (!websiteUrl) {
        summary.skipped += 1;
        console.log(
          `[${index}/${total}] ${restaurant.name} - SKIP: invalid website`
        );
        summary.details.push({
          name: restaurant.name,
          slug: restaurant.slug,
          status: "skipped",
          reason: "invalid_website",
        });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const html = await fetchWebsiteHtml(websiteUrl);
      await sleep(REQUEST_DELAY_MS);

      const imageUrl = findImageUrlFromHtml(websiteUrl, html);

      if (!imageUrl) {
        summary.skipped += 1;
        console.log(
          `[${index}/${total}] ${restaurant.name} - SKIP: no suitable image`
        );
        summary.details.push({
          name: restaurant.name,
          slug: restaurant.slug,
          status: "skipped",
          reason: "no_image_found",
          website: websiteUrl,
        });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const image = await downloadImage(imageUrl);
      await sleep(REQUEST_DELAY_MS);

      const publicUrl = await uploadToStorage(supabase, slug, image);
      await savePhotosColumn(supabase, restaurant.id, publicUrl);

      summary.saved += 1;
      console.log(`[${index}/${total}] ${restaurant.name} - OK: 1 photo`);
      summary.details.push({
        name: restaurant.name,
        slug: restaurant.slug,
        status: "saved",
        website: websiteUrl,
        sourceImage: imageUrl,
        publicUrl,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.failed += 1;
      console.log(`[${index}/${total}] ${restaurant.name} - FAIL: ${message}`);
      summary.details.push({
        name: restaurant.name,
        slug: restaurant.slug,
        status: "failed",
        website: websiteUrl,
        error: message,
      });
    }

    await sleep(REQUEST_DELAY_MS);
  }

  summary.completedAt = new Date().toISOString();
  const summaryPath = resolve(process.cwd(), "summary-website-images.json");
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log("\n========== Summary ==========");
  console.log(`Processed: ${summary.processed}`);
  console.log(`Saved: ${summary.saved}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Summary written to ${summaryPath}`);
  console.log("DONE.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
