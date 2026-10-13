/**
 * Upload restaurant photos + menu.txt from with-photos-part*.zip to R2 + Supabase.
 *
 * Usage:
 *   node scripts/upload-to-r2.js --dry-run
 *   node scripts/upload-to-r2.js --limit=5
 *   node scripts/upload-to-r2.js
 *   node scripts/upload-to-r2.js --resume   (skip folders in upload-progress.json)
 */

const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const sharp = require("sharp");
const pLimitImport = require("p-limit");
const pLimit = pLimitImport.default || pLimitImport;
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const { parseMenuTxt } = require("../lib/parse-menu-txt");
const {
  classifyRelativePath,
  emptyBucket,
  sortBucket,
} = require("../lib/menu-folder-files");
const {
  loadManualMap,
  ensureManualMapHeader,
  appendManualMapRow,
  buildRestaurantIndex,
  matchFolderToRestaurant,
  formatCandidates,
  extractCityFromFolder,
  extractMenuTxtHints,
  parseMetadataHints,
  mergeHints,
  disambiguateWithHints,
  pickByCity,
} = require("../lib/restaurant-folder-match");
const {
  getR2Config,
  publicUrlForKey,
  headObject,
  putObject,
} = require("../lib/r2");

const MENU_ROOT_RE = /^restaurant-menus(-\d+)?$/;
const ZIP_NAME_RE =
  /^(with-photos-part\d+|uk-restaurants-batch-\d+-part\d+)\.zip$/i;
const CONCURRENCY = 5;
const MAX_RETRIES = 3;
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const MIN_MENU_ITEMS = 3;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const RESUME = args.includes("--resume");
/** Re-process resume-skipped folders to write about_raw (and R2 about.txt) only. */
const BACKFILL_ABOUT = args.includes("--backfill-about");
const LIMIT = (() => {
  const flag = args.find((a) => a.startsWith("--limit"));
  if (!flag) return null;
  if (flag.includes("=")) return parseInt(flag.split("=")[1], 10);
  const i = args.indexOf("--limit");
  return parseInt(args[i + 1] || "0", 10) || null;
})();

const ZIP_GLOB_DIR =
  process.env.MENU_ZIP_DIR?.trim() ||
  path.join(process.env.USERPROFILE || "", "Downloads", "menu 2");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        await sleep(500 * attempt * attempt);
      }
    }
  }
  throw new Error(`${label}: ${lastErr?.message || lastErr}`);
}

function listZipFiles(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`ZIP directory not found: ${dir}`);
  }
  return fs
    .readdirSync(dir)
    .filter((f) => ZIP_NAME_RE.test(f))
    .map((f) => path.join(dir, f))
    .sort((a, b) => {
      const na = parseInt(a.match(/part(\d+)/i)?.[1] || "0", 10);
      const nb = parseInt(b.match(/part(\d+)/i)?.[1] || "0", 10);
      return na - nb;
    });
}

/** Zip layouts: restaurant-menus/Name/file or Name/file (batch-02). */
function parseZipEntryPath(entryName) {
  const parts = entryName.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length < 2) return null;

  if (parts.length >= 3 && MENU_ROOT_RE.test(parts[0])) {
    return { restaurantName: parts[1], relativePath: parts.slice(2).join("/") };
  }
  if (parts.length === 2) {
    return { restaurantName: parts[0], relativePath: parts[1] };
  }
  return null;
}

function indexRestaurantFolders(zipPaths) {
  const byName = new Map();

  for (const zipPath of zipPaths) {
    const zip = new AdmZip(zipPath);
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const parsed = parseZipEntryPath(entry.entryName);
      if (!parsed) continue;

      const { restaurantName, relativePath } = parsed;

      if (!byName.has(restaurantName)) {
        byName.set(restaurantName, emptyBucket());
      }
      const bucket = byName.get(restaurantName);
      const kind = classifyRelativePath(relativePath);

      if (kind === "menu_txt") {
        bucket.menuTxt = entry.getData().toString("utf8");
        continue;
      }
      if (kind === "about_txt") {
        bucket.aboutTxt = entry.getData().toString("utf8");
        continue;
      }
      if (kind === "metadata") {
        bucket.metadataFiles.push({
          name: path.basename(relativePath),
          text: entry.getData().toString("utf8"),
        });
        continue;
      }
      if (kind === "restaurant_photo") {
        bucket.restaurantPhotos.push({
          name: relativePath,
          buffer: () => entry.getData(),
        });
      }
    }
  }

  for (const entry of byName.values()) {
    sortBucket(entry);
  }

  return byName;
}

async function convertToWebp(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

async function fetchAllRestaurants(supabase, select) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function countMenuItems(menuData) {
  if (!menuData?.categories) return 0;
  return menuData.categories.reduce((n, c) => n + (c.items?.length || 0), 0);
}

function loadProgress(progressPath) {
  if (!RESUME || !fs.existsSync(progressPath)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(progressPath, "utf8"));
    return new Set(Array.isArray(data.completedFolders) ? data.completedFolders : []);
  } catch {
    return new Set();
  }
}

function saveProgress(progressPath, completedFolders) {
  fs.writeFileSync(
    progressPath,
    JSON.stringify({ completedFolders: [...completedFolders], updatedAt: new Date().toISOString() }, null, 2)
  );
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  let r2 = null;
  if (!DRY_RUN) {
    r2 = getR2Config();
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let restaurantSelect =
    "id, slug, name, city, address, postcode, phone, google_place_id, photos, menu_data, photos_backup, menu_data_backup, images_uploaded_at, about_raw";
  const { error: backupProbeErr } = await supabase
    .from("restaurants")
    .select("photos_backup, menu_data_backup")
    .limit(1);
  const backupReady = !(
    backupProbeErr &&
    /photos_backup|menu_data_backup/i.test(backupProbeErr.message)
  );
  const { error: uploadedAtErr } = await supabase
    .from("restaurants")
    .select("images_uploaded_at")
    .limit(1);
  const imagesUploadedAtReady = !(
    uploadedAtErr && /images_uploaded_at/i.test(uploadedAtErr.message)
  );
  const { error: aboutRawErr } = await supabase
    .from("restaurants")
    .select("about_raw")
    .limit(1);
  const aboutRawReady = !(
    aboutRawErr && /about_raw/i.test(aboutRawErr.message)
  );
  if (!backupReady) {
    console.warn(
      "photos_backup / menu_data_backup missing — uploading without DB backups (run add-photos-menu-backup-columns.sql)."
    );
    restaurantSelect =
      "id, slug, name, city, address, postcode, phone, google_place_id, photos, menu_data";
  }
  if (!aboutRawReady) {
    console.warn(
      "about_raw missing — about.txt will upload to R2 only (run add-about-content-columns.sql)."
    );
  }

  const zipPaths = listZipFiles(ZIP_GLOB_DIR);
  console.log(`Found ${zipPaths.length} zip files in ${ZIP_GLOB_DIR}`);

  const folderIndex = indexRestaurantFolders(zipPaths);
  const folderNames = [...folderIndex.keys()].sort((a, b) => a.localeCompare(b));
  console.log(`Indexed ${folderNames.length} unique restaurant folders`);

  const allRestaurants = await fetchAllRestaurants(supabase, restaurantSelect);
  const matchIndex = buildRestaurantIndex(allRestaurants);
  console.log(`Loaded ${allRestaurants.length} restaurants`);

  const logsDir = path.resolve(process.cwd(), "scripts/logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const unmatchedLog = path.join(logsDir, "unmatched.log");
  const menuParseFailedLog = path.join(logsDir, "menu-parse-failed.log");
  const manualMapPath = path.join(logsDir, "manual-map.csv");
  const fuzzyLogPath = path.join(logsDir, "fuzzy-matches.csv");
  const progressPath = path.join(logsDir, "upload-progress.json");

  ensureManualMapHeader(manualMapPath);
  if (!RESUME) {
    fs.writeFileSync(unmatchedLog, "");
    fs.writeFileSync(menuParseFailedLog, "");
    fs.writeFileSync(
      fuzzyLogPath,
      "folder_name,status,matched_slug,matched_name,score,reason\n",
      "utf8"
    );
  }

  const manualMap = loadManualMap(manualMapPath);
  const completedFolders = loadProgress(progressPath);
  const ambiguousSeen = new Set();

  const summary = {
    totalFolders: folderNames.length,
    restaurantsUpdated: 0,
    photosUploaded: 0,
    menusReplaced: 0,
    menusKept: 0,
    aboutTxtFound: 0,
    aboutTxtSaved: 0,
    matchedExact: 0,
    matchedFuzzy: 0,
    fuzzyAccepted: 0,
    fuzzyRejected: 0,
    ambiguousAutoResolved: 0,
    ambiguousLeftManual: 0,
    unmatched: 0,
    skippedResume: 0,
    failed: 0,
    dryRun: DRY_RUN,
  };

  let processedCount = 0;
  const totalTarget = LIMIT ?? folderNames.length;
  const sampleSlugs = [];

  for (const folderName of folderNames) {
    if (LIMIT != null && processedCount >= LIMIT) break;

    const resumeSkip =
      RESUME && completedFolders.has(folderName) && !BACKFILL_ABOUT;
    if (resumeSkip) {
      summary.skippedResume++;
      continue;
    }

    const local = folderIndex.get(folderName);
    let match = matchFolderToRestaurant({
      folderName,
      menuTxt: local.menuTxt,
      metadataFiles: local.metadataFiles,
      index: matchIndex,
      manualSlug: manualMap.get(folderName),
    });

    if (match.type === "ambiguous") {
      const cityHint = extractCityFromFolder(folderName, matchIndex.cityList);
      const hints = mergeHints(
        parseMetadataHints(local.metadataFiles),
        extractMenuTxtHints(local.menuTxt, folderName)
      );
      const pool = pickByCity(match.candidates, cityHint);
      const auto = disambiguateWithHints(pool, hints);
      if (auto) {
        match = { type: "matched", row: auto, via: "ambiguous-auto" };
        summary.ambiguousAutoResolved++;
      } else {
        summary.ambiguousLeftManual++;
        if (!ambiguousSeen.has(folderName)) {
          appendManualMapRow(
            manualMapPath,
            folderName,
            formatCandidates(match.candidates)
          );
          ambiguousSeen.add(folderName);
        }
        continue;
      }
    }

    if (match.type === "fuzzy_rejected") {
      summary.fuzzyRejected++;
      fs.appendFileSync(
        fuzzyLogPath,
        `"${folderName.replace(/"/g, '""')}",rejected,"${match.row?.slug || ""}","${String(match.row?.name || "").replace(/"/g, '""')}",${match.score?.toFixed(4) || ""},"${match.reason}"\n`
      );
      fs.appendFileSync(unmatchedLog, `${folderName} (fuzzy rejected: ${match.reason})\n`);
      summary.unmatched++;
      continue;
    }

    if (match.type === "unmatched") {
      fs.appendFileSync(unmatchedLog, `${folderName}\n`);
      summary.unmatched++;
      continue;
    }

    if (match.type === "fuzzy") {
      summary.matchedFuzzy++;
      summary.fuzzyAccepted++;
      fs.appendFileSync(
        fuzzyLogPath,
        `"${folderName.replace(/"/g, '""')}",accepted,"${match.row.slug}","${String(match.row.name).replace(/"/g, '""')}",${match.score.toFixed(4)},"${match.reason || ""}"\n`
      );
    } else {
      summary.matchedExact++;
    }

    const row = match.row;
    processedCount++;

    const parsed = local.menuTxt
      ? parseMenuTxt(local.menuTxt, { restaurantName: folderName })
      : { ok: false, reason: "no_menu_txt", itemCount: 0 };

    const itemCount = parsed.itemCount ?? countMenuItems(parsed.menuData);
    const menuOk = parsed.ok && itemCount >= MIN_MENU_ITEMS;
    const hasAbout = Boolean(local.aboutTxt?.trim());
    if (hasAbout) summary.aboutTxtFound++;

    if (DRY_RUN) {
      console.log(
        `[${processedCount}/${totalTarget}] ${row.name} (${row.slug}) — ${local.restaurantPhotos.length} photos, menu ${menuOk ? `${itemCount} items` : "skip"}, about ${hasAbout ? "yes" : "no"}`
      );
      if (menuOk) summary.menusReplaced++;
      else summary.menusKept++;
      if (hasAbout) summary.aboutTxtSaved++;
      summary.photosUploaded += local.restaurantPhotos.length;
      summary.restaurantsUpdated++;
      continue;
    }

    try {
      if (BACKFILL_ABOUT) {
        if (!local.aboutTxt?.trim()) continue;
        if (!aboutRawReady) {
          console.warn("about_raw column missing — cannot backfill");
          continue;
        }
        const aboutKey = `restaurants/${row.slug}/about.txt`;
        await withRetry(
          () =>
            putObject(
              r2.client,
              r2.bucket,
              aboutKey,
              Buffer.from(local.aboutTxt.trim(), "utf8"),
              "text/plain; charset=utf-8",
              CACHE_CONTROL
            ),
          `put ${aboutKey}`
        );
        const { error: updateErr } = await supabase
          .from("restaurants")
          .update({
            about_raw: local.aboutTxt.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (updateErr) throw new Error(updateErr.message);
        summary.aboutTxtFound++;
        summary.aboutTxtSaved++;
        summary.restaurantsUpdated++;
        console.log(`[about] ${row.name} (${row.slug}) ✅`);
        continue;
      }

      const uploadLimit = pLimit(CONCURRENCY);
      const photoUrls = await Promise.all(
        local.restaurantPhotos.map((img, idx) =>
          uploadLimit(async () => {
            const key = `restaurants/${row.slug}/photos/photo-${idx + 1}.webp`;
            const webp = await withRetry(
              () => convertToWebp(img.buffer()),
              `webp ${key}`
            );
            await withRetry(
              () =>
                putObject(
                  r2.client,
                  r2.bucket,
                  key,
                  webp,
                  "image/webp",
                  CACHE_CONTROL
                ),
              `put ${key}`
            );
            return publicUrlForKey(r2.publicUrl, key);
          })
        )
      );

      if (local.menuTxt) {
        const menuTxtKey = `restaurants/${row.slug}/menu/menu.txt`;
        await withRetry(
          () =>
            putObject(
              r2.client,
              r2.bucket,
              menuTxtKey,
              Buffer.from(local.menuTxt, "utf8"),
              "text/plain; charset=utf-8",
              CACHE_CONTROL
            ),
          `put ${menuTxtKey}`
        );
      }

      if (local.aboutTxt?.trim()) {
        const aboutKey = `restaurants/${row.slug}/about.txt`;
        await withRetry(
          () =>
            putObject(
              r2.client,
              r2.bucket,
              aboutKey,
              Buffer.from(local.aboutTxt.trim(), "utf8"),
              "text/plain; charset=utf-8",
              CACHE_CONTROL
            ),
          `put ${aboutKey}`
        );
      }

      const uploadedAt = new Date().toISOString();
      const update = {
        updated_at: uploadedAt,
        photos: photoUrls,
      };
      if (aboutRawReady && local.aboutTxt?.trim()) {
        update.about_raw = local.aboutTxt.trim();
        summary.aboutTxtSaved++;
      }
      if (imagesUploadedAtReady) {
        update.images_uploaded_at = uploadedAt;
      }

      if (backupReady) {
        update.photos_backup = row.photos ?? null;
      }

      if (menuOk) {
        if (backupReady) {
          update.menu_data_backup = row.menu_data ?? null;
        }
        update.menu_data = parsed.menuData;
        summary.menusReplaced++;
      } else {
        summary.menusKept++;
        fs.appendFileSync(
          menuParseFailedLog,
          `${folderName} (${row.slug}): ${parsed.reason || "too_few_items"} items=${itemCount}\n`
        );
      }

      const { error: updateErr } = await supabase
        .from("restaurants")
        .update(update)
        .eq("id", row.id);

      if (updateErr) throw new Error(updateErr.message);

      summary.restaurantsUpdated++;
      summary.photosUploaded += photoUrls.length;
      completedFolders.add(folderName);
      saveProgress(progressPath, completedFolders);

      if (sampleSlugs.length < 5) sampleSlugs.push(row.slug);

      console.log(
        `[${processedCount}/${totalTarget}] ${row.name} — ${photoUrls.length} photos, menu ${menuOk ? `${itemCount} items` : "kept"} ✅`
      );
    } catch (err) {
      console.error(
        `[${processedCount}/${totalTarget}] ${row.name} — FAILED: ${err.message}`
      );
      summary.failed++;
    }
  }

  summary.sampleSlugs = sampleSlugs;
  const summaryPath = path.join(logsDir, "upload-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log("\n--- Summary ---");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Summary: ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
