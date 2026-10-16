/**
 * Audit Supabase Storage + scan DB for supabase.co URLs.
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing Supabase URL or service role key");
  process.exit(1);
}

const supabase = createClient(url, key);

function collectStrings(value, out) {
  if (value == null) return;
  if (typeof value === "string") {
    if (/supabase\.co/i.test(value)) out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out);
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
}

async function scanRestaurantsForSupabaseUrls() {
  const hits = [];
  let offset = 0;
  const page = 500;
  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "id,slug,photos,photos_backup,menu_data,menu_data_backup,about_content,seo_content"
      )
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      const urls = [];
      collectStrings(row, urls);
      if (urls.length) {
        hits.push({
          slug: row.slug,
          id: row.id,
          sample: urls.slice(0, 3),
          count: urls.length,
        });
      }
    }
    if (data.length < page) break;
    offset += page;
  }
  return hits;
}

async function scanRestaurantPhotosTable() {
  const hits = [];
  let offset = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("restaurant_photos")
      .select("restaurant_id,url")
      .ilike("url", "%supabase.co%")
      .range(offset, offset + page - 1);
    if (error) {
      if (/does not exist/i.test(error.message)) return hits;
      throw error;
    }
    if (!data?.length) break;
    hits.push(...data);
    if (data.length < page) break;
    offset += page;
  }
  return hits;
}

async function listBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  return data ?? [];
}

async function listAllObjects(bucket, prefix = "") {
  const all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) break;
    for (const item of data) {
      if (item.id) {
        all.push({ path: prefix ? `${prefix}/${item.name}` : item.name, meta: item });
      } else if (item.name && !item.metadata) {
        const nested = await listAllObjects(
          bucket,
          prefix ? `${prefix}/${item.name}` : item.name
        );
        all.push(...nested);
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

async function main() {
  console.log("=== Storage buckets ===");
  const buckets = await listBuckets();
  for (const b of buckets) {
    console.log(JSON.stringify(b));
    try {
      const objects = await listAllObjects(b.name);
      let bytes = 0;
      for (const o of objects) {
        const sz = o.meta?.metadata?.size ?? o.meta?.metadata?.contentLength;
        if (typeof sz === "number") bytes += sz;
      }
      console.log(
        `  bucket=${b.name} files~=${objects.length} sizeKnownBytes=${bytes}`
      );
    } catch (e) {
      console.log(`  list error: ${e.message}`);
    }
  }

  console.log("\n=== supabase.co in restaurants ===");
  const restHits = await scanRestaurantsForSupabaseUrls();
  console.log(`count=${restHits.length}`);
  if (restHits.length) console.log(JSON.stringify(restHits.slice(0, 20), null, 2));

  console.log("\n=== supabase.co in restaurant_photos ===");
  const photoHits = await scanRestaurantPhotosTable();
  console.log(`count=${photoHits.length}`);
  if (photoHits.length) console.log(JSON.stringify(photoHits.slice(0, 20), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
