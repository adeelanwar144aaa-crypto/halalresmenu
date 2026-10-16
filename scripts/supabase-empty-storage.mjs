/**
 * Delete all objects in Supabase Storage buckets after DB has zero supabase.co URLs.
 *   node scripts/supabase-empty-storage.mjs --dry-run
 *   node scripts/supabase-empty-storage.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const DRY = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(url, key);

function collectStrings(value, out) {
  if (value == null) return;
  if (typeof value === "string") {
    if (/supabase\.co/i.test(value)) out.push(value);
    return;
  }
  if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (typeof value === "object")
    for (const v of Object.values(value)) collectStrings(v, out);
}

async function assertZeroSupabaseRefs() {
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("slug,photos,menu_data,about_content,seo_content")
      .range(offset, offset + 499);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      const hits = [];
      collectStrings(row, hits);
      if (hits.length) {
        throw new Error(
          `Still ${hits.length} supabase.co refs on slug=${row.slug}; aborting storage delete.`
        );
      }
    }
    if (data.length < 500) break;
    offset += 500;
  }
}

async function listPaths(bucket, prefix = "") {
  const paths = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
    });
    if (error) throw error;
    if (!data?.length) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) paths.push(path);
      else paths.push(...(await listPaths(bucket, path)));
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return paths;
}

async function main() {
  await assertZeroSupabaseRefs();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (!buckets?.length) {
    console.log("No storage buckets (API). If dashboard shows storage, delete via Storage UI.");
    return;
  }
  for (const b of buckets) {
    const paths = await listPaths(b.name);
    console.log(`bucket=${b.name} files=${paths.length}`);
    if (DRY) continue;
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { error: delErr } = await supabase.storage.from(b.name).remove(chunk);
      if (delErr) throw delErr;
    }
    console.log(`  deleted ${paths.length} objects`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
