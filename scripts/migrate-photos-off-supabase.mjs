/**
 * Copy legacy Supabase Storage photos → R2 and update restaurants.photos.
 *
 *   node scripts/migrate-photos-off-supabase.mjs
 *   node scripts/migrate-photos-off-supabase.mjs --dry-run
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { writeFileSync } from "fs";
import {
  getR2Config,
  headObject,
  publicUrlForKey,
  putObject,
} from "../lib/r2.js";

const DRY = process.argv.includes("--dry-run");
const MAX_RETRIES = 3;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !key) process.exit(1);

const supabase = createClient(supabaseUrl, key);
const r2 = getR2Config();

const report = {
  startedAt: new Date().toISOString(),
  dryRun: DRY,
  moved: [],
  failed: [],
  skippedRestaurants: 0,
};

function parsePhotos(raw) {
  if (raw == null) return [];
  let arr = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(arr) ? arr.map(String) : [];
}

async function fetchWithRetries(url) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }
  }
  throw lastErr;
}

async function ensureR2FromLegacyUrl(supabasePublicUrl, r2Key) {
  if (await headObject(r2.client, r2.bucket, r2Key)) {
    return { url: publicUrlForKey(r2.publicUrl, r2Key), copied: false };
  }
  const buf = await fetchWithRetries(supabasePublicUrl);
  const webp = await sharp(buf).webp({ quality: 82 }).toBuffer();
  await putObject(
    r2.client,
    r2.bucket,
    r2Key,
    webp,
    "image/webp",
    "public, max-age=31536000, immutable"
  );
  return { url: publicUrlForKey(r2.publicUrl, r2Key), copied: true };
}

async function migrateRow(row) {
  const photos = parsePhotos(row.photos);
  if (!photos.some((u) => /supabase\.co/i.test(u))) {
    report.skippedRestaurants++;
    return;
  }

  const newUrls = [];
  let r2PhotoIndex = 0;
  const rowFailures = [];

  for (const u of photos) {
    if (!/supabase\.co/i.test(u)) {
      newUrls.push(u);
      continue;
    }
    r2PhotoIndex += 1;
    const r2Key = `restaurants/${row.slug}/photos/photo-${r2PhotoIndex}.webp`;
    try {
      if (DRY) {
        newUrls.push(publicUrlForKey(r2.publicUrl, r2Key));
        continue;
      }
      const { url: r2Url } = await ensureR2FromLegacyUrl(u, r2Key);
      newUrls.push(r2Url);
    } catch (err) {
      rowFailures.push({
        slug: row.slug,
        sourceUrl: u,
        r2Key,
        reason: err?.message || String(err),
      });
      break;
    }
  }

  if (rowFailures.length) {
    report.failed.push(...rowFailures);
    return;
  }

  if (DRY) {
    report.moved.push({ slug: row.slug, photos: newUrls.length });
    return;
  }

  const { error } = await supabase
    .from("restaurants")
    .update({ photos: newUrls, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) {
    report.failed.push({
      slug: row.slug,
      sourceUrl: "(db update)",
      reason: error.message,
    });
    return;
  }
  report.moved.push({ slug: row.slug, photos: newUrls.length });
}

async function main() {
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id,slug,photos")
      .not("slug", "is", null)
      .order("id")
      .range(offset, offset + 99);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      const photos = parsePhotos(row.photos);
      if (!photos.some((u) => /supabase\.co/i.test(u))) continue;
      await migrateRow(row);
      const slug = row.slug;
      if (report.moved.some((m) => m.slug === slug)) {
        console.log(`moved ${slug}`);
      } else if (report.failed.some((f) => f.slug === slug)) {
        console.log(`FAILED ${slug}`);
      }
    }
    if (data.length < 100) break;
    offset += 100;
  }

  report.finishedAt = new Date().toISOString();
  report.summary = {
    movedRestaurants: report.moved.length,
    failedEntries: report.failed.length,
    failedSlugs: [...new Set(report.failed.map((f) => f.slug))].length,
  };

  writeFileSync(
    "scripts/migrate-photos-report.json",
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report.summary));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
