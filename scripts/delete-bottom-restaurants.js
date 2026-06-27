/**
 * Delete bottom-1,000 restaurants (v2 scoring: sole-city protected, sparse bonus)
 * and remove their photos from Supabase Storage.
 *
 * Usage:
 *   node scripts/delete-bottom-restaurants.js           # dry-run (report only)
 *   node scripts/delete-bottom-restaurants.js --execute # perform deletion
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 * If REST API returns 402 (quota): set DATABASE_URL (direct Postgres URI) in .env.local
 *   and use scripts/sql/delete-bottom-1000-v2.sql in SQL Editor for DB rows;
 *   delete Storage files via Dashboard → Storage (API also returns 402 until under quota).
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { writeFileSync, mkdirSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const EXECUTE = process.argv.includes("--execute");
const STORAGE_BUCKET = "restaurant-photos";
const DELETE_COUNT = 1000;
const PAGE_SIZE = 1000;

const PARAMS = {
  sparseCityMax: 5,
  minCityPeers: 5,
  requiredPhotos: 3,
  sparseCityBonus: 12,
};

const ONE_GB_BYTES = 1024 * 1024 * 1024;

function trim(s) {
  return String(s ?? "").trim();
}

function cityKey(city) {
  const c = trim(city).toLowerCase();
  return c || null;
}

function countValidPhotoUrls(photos) {
  if (photos == null) return 0;
  let arr = photos;
  if (typeof photos === "string") {
    try {
      arr = JSON.parse(photos);
    } catch {
      return /^https?:\/\//i.test(trim(photos)) ? 1 : 0;
    }
  }
  if (!Array.isArray(arr)) return 0;
  return arr.filter(
    (u) => typeof u === "string" && trim(u) && /^https?:\/\//i.test(trim(u))
  ).length;
}

function hasMenuItems(menuData) {
  if (!menuData || typeof menuData !== "object") return false;
  const categories = menuData.categories;
  if (!Array.isArray(categories) || categories.length === 0) return false;
  return categories.some(
    (cat) => Array.isArray(cat?.items) && cat.items.length > 0
  );
}

function seoField(seo, key) {
  if (!seo || typeof seo !== "object") return "";
  return trim(seo[key]);
}

function scoreRestaurant(row, cityCounts) {
  const key = cityKey(row.city);
  const restaurantsInCity = key ? (cityCounts.get(key) ?? 0) : 0;
  const validPhotoUrlCount = countValidPhotoUrls(row.photos);

  let photoPts = 0;
  if (validPhotoUrlCount >= PARAMS.requiredPhotos) photoPts = 30;
  else if (validPhotoUrlCount === 2) photoPts = 15;
  else if (validPhotoUrlCount === 1) photoPts = 5;

  const descLen = trim(row.description).length;
  const descPts = descLen >= 40 ? 10 : 0;
  const menuPts = hasMenuItems(row.menu_data) ? 10 : 0;
  const seoAboutPts = seoField(row.seo_content, "about_section").length >= 80 ? 5 : 0;
  const seoMetaPts =
    seoField(row.seo_content, "meta_description").length >= 40 ? 5 : 0;
  const textPts = descPts + menuPts + seoAboutPts + seoMetaPts;

  const ratingPts =
    row.rating != null && Number(row.rating) > 0 ? 15 : 0;
  const reviewsPts =
    row.total_reviews != null && Number(row.total_reviews) > 0 ? 15 : 0;
  const ratingPtsTotal = ratingPts + reviewsPts;

  let cityPts = 0;
  if (restaurantsInCity > PARAMS.minCityPeers) cityPts = 15;
  else if (restaurantsInCity >= 2) cityPts = 8;

  const isSoleCityRestaurant = restaurantsInCity === 1;
  const cityProtectionBonus =
    restaurantsInCity >= 2 && restaurantsInCity <= PARAMS.sparseCityMax
      ? PARAMS.sparseCityBonus
      : 0;

  const completenessScore = photoPts + textPts + ratingPtsTotal + cityPts;
  const adjustedScore = completenessScore + cityProtectionBonus;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    rating: row.rating,
    total_reviews: row.total_reviews,
    restaurantsInCity,
    validPhotoUrlCount,
    completenessScore,
    cityProtectionBonus,
    adjustedScore,
    isSoleCityRestaurant,
    photos: row.photos,
  };
}

async function fetchAllActiveRestaurants(supabase) {
  const rows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "id,slug,name,city,rating,total_reviews,photos,description,menu_data,seo_content,is_active"
      )
      .or("is_active.is.null,is_active.eq.true")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`fetch restaurants: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

function buildCityCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = cityKey(row.city);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function selectDeletionCandidates(rows, cityCounts) {
  const scored = rows.map((r) => scoreRestaurant(r, cityCounts));
  const eligible = scored.filter((s) => !s.isSoleCityRestaurant);

  eligible.sort((a, b) => {
    if (a.adjustedScore !== b.adjustedScore) return a.adjustedScore - b.adjustedScore;
    if (a.validPhotoUrlCount !== b.validPhotoUrlCount)
      return a.validPhotoUrlCount - b.validPhotoUrlCount;
    const aReviews = Number(a.total_reviews ?? 0);
    const bReviews = Number(b.total_reviews ?? 0);
    if (aReviews !== bReviews) return aReviews - bReviews;
    const aRating = Number(a.rating ?? 0);
    const bRating = Number(b.rating ?? 0);
    if (aRating !== bRating) return aRating - bRating;
    if (a.restaurantsInCity !== b.restaurantsInCity)
      return (a.restaurantsInCity ?? 0) - (b.restaurantsInCity ?? 0);
    return String(a.slug).localeCompare(String(b.slug));
  });

  return eligible.slice(0, DELETE_COUNT);
}

function storagePathsForSlug(slug) {
  const paths = [];
  for (let i = 1; i <= 3; i++) {
    paths.push(`restaurant-photos/${slug}/photo-${i}.jpg`);
  }
  return paths;
}

function storagePathFromPublicUrl(url) {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
}

function collectStoragePaths(candidate) {
  const paths = new Set(storagePathsForSlug(candidate.slug));

  let photos = candidate.photos;
  if (typeof photos === "string") {
    try {
      photos = JSON.parse(photos);
    } catch {
      photos = [photos];
    }
  }
  if (Array.isArray(photos)) {
    for (const url of photos) {
      if (typeof url !== "string") continue;
      const p = storagePathFromPublicUrl(url);
      if (p) paths.add(p);
    }
  }

  return [...paths];
}

async function listBucketStats(supabase) {
  let offset = 0;
  const limit = 1000;
  let totalFiles = 0;
  let totalBytes = 0;
  const prefixStack = [""];

  while (prefixStack.length > 0) {
    const prefix = prefixStack.pop();
    offset = 0;

    while (true) {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });

      if (error) {
        if (error.message?.includes("not found")) {
          return { totalFiles: 0, totalBytes: 0, error: error.message };
        }
        throw new Error(`storage list (${prefix || "root"}): ${error.message}`);
      }

      if (!data?.length) break;

      for (const item of data) {
        if (item.id == null && item.name) {
          const child = prefix ? `${prefix}/${item.name}` : item.name;
          prefixStack.push(child);
        } else {
          totalFiles += 1;
          totalBytes += Number(item.metadata?.size ?? 0);
        }
      }

      if (data.length < limit) break;
      offset += limit;
    }
  }

  return { totalFiles, totalBytes, error: null };
}

async function deleteInBatches(supabase, table, column, ids, batchSize = 100) {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .in(column, batch);
    if (error && !error.message.includes("does not exist")) {
      throw new Error(`${table} delete: ${error.message}`);
    }
    deleted += count ?? batch.length;
  }
  return deleted;
}

async function deleteStoragePaths(supabase, paths) {
  let removed = 0;
  const batchSize = 100;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(batch);
    if (error) {
      console.warn(`  storage remove warning: ${error.message}`);
    } else {
      removed += batch.length;
    }
  }
  return removed;
}

function formatBytes(n) {
  if (n >= ONE_GB_BYTES) return `${(n / ONE_GB_BYTES).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${n} B`;
}

async function main() {
  const url = trim(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = trim(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  console.log(`Mode: ${EXECUTE ? "EXECUTE (destructive)" : "DRY-RUN"}`);
  console.log("Indexing status: not tracked in this project — using completeness v2 only.\n");

  const { count: totalBefore, error: countErr } = await supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true })
    .or("is_active.is.null,is_active.eq.true");

  if (countErr) throw new Error(`count restaurants: ${countErr.message}`);

  console.log(`Active restaurants before: ${totalBefore}`);

  console.log("Scanning storage bucket (may take a minute)...");
  const storageBefore = await listBucketStats(supabase);
  console.log(
    `Storage before: ${storageBefore.totalFiles} files, ${formatBytes(storageBefore.totalBytes)}`
  );

  console.log("Loading and scoring restaurants...");
  const rows = await fetchAllActiveRestaurants(supabase);
  const cityCounts = buildCityCounts(rows);
  const soleCount = [...cityCounts.values()].filter((n) => n === 1).length;
  console.log(`Cities with sole restaurant (protected): ${soleCount} city keys`);

  const candidates = selectDeletionCandidates(rows, cityCounts);
  if (candidates.length < DELETE_COUNT) {
    console.warn(
      `Warning: only ${candidates.length} eligible candidates (expected ${DELETE_COUNT})`
    );
  }

  const ids = candidates.map((c) => c.id);
  const slugs = candidates.map((c) => c.slug);
  const allStoragePaths = [...new Set(candidates.flatMap(collectStoragePaths))];

  const scoreMin = Math.min(...candidates.map((c) => c.adjustedScore));
  const scoreMax = Math.max(...candidates.map((c) => c.adjustedScore));
  const sampleSlugs = candidates.slice(-10).map((c) => c.slug);

  console.log("\n--- Deletion plan ---");
  console.log(`Candidates: ${candidates.length}`);
  console.log(`Adjusted score range: ${scoreMin} – ${scoreMax}`);
  console.log(`Storage paths to remove: ${allStoragePaths.length}`);
  console.log(`Sample slugs (lowest scores): ${sampleSlugs.join(", ")}`);

  const reportPath = resolve(process.cwd(), "scripts/output/deletion-candidates-v2.json");
  mkdirSync(resolve(process.cwd(), "scripts/output"), { recursive: true });
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: EXECUTE ? "executed" : "dry-run",
        totalActiveBefore: totalBefore,
        candidateCount: candidates.length,
        adjustedScoreRange: [scoreMin, scoreMax],
        storagePathsCount: allStoragePaths.length,
        candidates,
        storagePaths: allStoragePaths,
      },
      null,
      2
    )
  );
  console.log(`\nCandidate list written: ${reportPath}`);

  if (!EXECUTE) {
    console.log("\nDry-run complete. Re-run with --execute to delete.");
    return;
  }

  console.log("\n--- Deleting related rows ---");
  const tables = [
    ["menu_items", "restaurant_id"],
    ["menu_categories", "restaurant_id"],
    ["restaurant_photos", "restaurant_id"],
    ["reviews", "restaurant_id"],
  ];

  for (const [table, col] of tables) {
    try {
      const n = await deleteInBatches(supabase, table, col, ids);
      console.log(`  ${table}: ${n} rows`);
    } catch (err) {
      console.warn(`  ${table}: skipped (${err.message})`);
    }
  }

  console.log("\n--- Deleting storage files ---");
  const storageRemoved = await deleteStoragePaths(supabase, allStoragePaths);
  console.log(`  Removed ${storageRemoved} storage object(s)`);

  console.log("\n--- Deleting restaurant rows ---");
  const restaurantsDeleted = await deleteInBatches(supabase, "restaurants", "id", ids);
  console.log(`  restaurants: ${restaurantsDeleted} rows`);

  const { count: totalAfter } = await supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true })
    .or("is_active.is.null,is_active.eq.true");

  console.log("\nScanning storage bucket after deletion...");
  const storageAfter = await listBucketStats(supabase);

  const underLimit = storageAfter.totalBytes < ONE_GB_BYTES;

  console.log("\n========== FINAL SUMMARY ==========");
  console.log(`Restaurants deleted:        ${candidates.length}`);
  console.log(`Active restaurants before: ${totalBefore}`);
  console.log(`Active restaurants after:  ${totalAfter}`);
  console.log(
    `Storage before:            ${storageBefore.totalFiles} files, ${formatBytes(storageBefore.totalBytes)}`
  );
  console.log(
    `Storage after:             ${storageAfter.totalFiles} files, ${formatBytes(storageAfter.totalBytes)}`
  );
  console.log(
    `Storage freed (approx):    ${formatBytes(Math.max(0, storageBefore.totalBytes - storageAfter.totalBytes))}`
  );
  console.log(
    `Under 1 GB free tier:      ${underLimit ? "YES" : "NO — still over by " + formatBytes(storageAfter.totalBytes - ONE_GB_BYTES)}`
  );
  console.log("\nSitemaps: dynamic routes read live from DB — deleted URLs drop out automatically.");
  console.log("Purge Cloudflare edge cache (or redeploy) so /sitemap.xml is not served stale.");
  console.log("===================================\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
