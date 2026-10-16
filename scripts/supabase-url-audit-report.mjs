/**
 * Read-only: buckets + supabase.co URL references by column/path.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(url, key);

const TRACKED_TOP = [
  "photos",
  "photos_backup",
  "menu_data",
  "menu_data_backup",
  "about_content",
  "seo_content",
  "reviews",
  "logo_url",
  "description",
  "website",
];

function walk(value, path, hits) {
  if (value == null) return;
  if (typeof value === "string") {
    if (/supabase\.co/i.test(value)) {
      hits.push({ path, url: value });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, hits));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      walk(v, path ? `${path}.${k}` : k, hits);
    }
  }
}

async function listAllFiles(bucket, prefix = "") {
  const files = [];
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
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id != null) {
        const meta = item.metadata ?? {};
        const size =
          typeof meta.size === "number"
            ? meta.size
            : typeof meta.contentLength === "number"
              ? meta.contentLength
              : 0;
        files.push({ path: full, size, updated: item.updated_at ?? null });
      } else {
        files.push(...(await listAllFiles(bucket, full)));
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return files;
}

async function bucketReport() {
  const reports = [];
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) reports.push({ error: error.message });

  const names =
    buckets?.length > 0
      ? buckets.map((b) => b.name)
      : ["restaurant-photos", "restaurant-menus", "menus", "photos"];

  const seen = new Set();
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    try {
      const files = await listAllFiles(name);
      const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0);
      reports.push({
        bucket: name,
        fileCount: files.length,
        totalBytes,
        totalPretty:
          totalBytes > 0
            ? `${(totalBytes / 1024 / 1024).toFixed(2)} MB (metadata only; may undercount)`
            : "0 B (or sizes not in list metadata)",
        public: buckets?.find((b) => b.name === name)?.public ?? null,
      });
    } catch (e) {
      reports.push({ bucket: name, error: e.message });
    }
  }

  if (buckets?.length) {
    return { listBucketsApi: buckets, bucketDetails: reports };
  }
  return {
    listBucketsApi: [],
    note: "listBuckets returned []. Probed common bucket names directly.",
    bucketDetails: reports,
  };
}

async function restaurantReport() {
  const select =
    "slug,name," +
    TRACKED_TOP.join(",") +
    ",menu_images,rating,total_reviews";
  const byColumn = {};
  const byPath = {};
  const restaurants = new Map();
  let offset = 0;
  let totalRows = 0;

  while (true) {
    let q = supabase.from("restaurants").select(select).not("slug", "is", null);
    const { data, error } = await q.range(offset, offset + 299);
    if (error) {
      if (/menu_images|photos_backup|menu_data_backup|logo_url/i.test(error.message)) {
        const slim =
          "slug,name,photos,menu_data,about_content,seo_content,reviews,description,website";
        const retry = await supabase
          .from("restaurants")
          .select(slim)
          .not("slug", "is", null)
          .range(offset, offset + 299);
        if (retry.error) throw retry.error;
        processBatch(retry.data, byColumn, byPath, restaurants);
        totalRows += retry.data?.length ?? 0;
        if (!retry.data?.length || retry.data.length < 300) break;
        offset += 300;
        continue;
      }
      throw error;
    }
    processBatch(data, byColumn, byPath, restaurants);
    totalRows += data?.length ?? 0;
    if (!data?.length || data.length < 300) break;
    offset += 300;
  }

  return {
    totalRestaurantsScanned: totalRows,
    restaurantsWithAnySupabaseUrl: restaurants.size,
    hitsByTopLevelColumn: byColumn,
    hitsByJsonPath: Object.fromEntries(
      Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 30)
    ),
    examples: [...restaurants.values()]
      .slice(0, 5)
      .map((r) => ({
        slug: r.slug,
        name: r.name,
        urls: r.hits.map((h) => ({ field: h.path, url: h.url })),
      })),
  };
}

function processBatch(data, byColumn, byPath, restaurants) {
  for (const row of data ?? []) {
    const hits = [];
    for (const col of Object.keys(row)) {
      if (col === "slug" || col === "name") continue;
      const colHits = [];
      walk(row[col], col, colHits);
      if (colHits.length) {
        byColumn[col] = (byColumn[col] || 0) + 1;
        for (const h of colHits) {
          byPath[h.path] = (byPath[h.path] || 0) + 1;
          hits.push(h);
        }
      }
    }
    if (hits.length) {
      restaurants.set(row.slug, { slug: row.slug, name: row.name, hits });
    }
  }
}

async function main() {
  const storage = await bucketReport();
  const restaurants = await restaurantReport();
  const out = { generatedAt: new Date().toISOString(), storage, restaurants };
  writeFileSync(
    "scripts/supabase-url-audit-report.json",
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
