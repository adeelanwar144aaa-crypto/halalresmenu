/**
 * Rewrite menu image URLs to use R2_PUBLIC_URL (fixes S3 API host stored by mistake).
 * Updates menu_images column and/or menu_data.image_urls.
 *
 * Usage:
 *   node scripts/fix-menu-image-urls.js --dry-run
 *   node scripts/fix-menu-image-urls.js
 */

const path = require("path");
const { config } = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const { assertPublicR2BaseUrl, publicUrlForKey } = require("../lib/r2");

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const DRY_RUN = process.argv.includes("--dry-run");

function pathFromStoredUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

function rewriteUrls(urls, publicBase) {
  return urls.map((url) => {
    const key = pathFromStoredUrl(url);
    if (!key) return url;
    return publicUrlForKey(publicBase, key);
  });
}

function needsRewrite(urls) {
  return urls.some((u) => /r2\.cloudflarestorage\.com/i.test(String(u)));
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const publicBase = process.env.R2_PUBLIC_URL?.trim()?.replace(/\/$/, "");
  if (!supabaseUrl || !supabaseKey || !publicBase) {
    console.error("Missing Supabase or R2_PUBLIC_URL env");
    process.exit(1);
  }
  assertPublicR2BaseUrl(publicBase);

  const supabase = createClient(supabaseUrl, supabaseKey);

  let select = "id, slug, menu_images, menu_data";
  let { data: rows, error } = await supabase
    .from("restaurants")
    .select(select)
    .limit(5000);

  if (error && /menu_images/i.test(error.message)) {
    select = "id, slug, menu_data";
    ({ data: rows, error } = await supabase
      .from("restaurants")
      .select(select)
      .limit(5000));
  }

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  let updated = 0;
  for (const row of rows || []) {
    const patch = { updated_at: new Date().toISOString() };
    let changed = false;

    const columnUrls = Array.isArray(row.menu_images)
      ? row.menu_images.map(String)
      : [];
    if (columnUrls.length > 0 && needsRewrite(columnUrls)) {
      patch.menu_images = rewriteUrls(columnUrls, publicBase);
      changed = true;
      console.log(
        `${row.slug} (menu_images): ${columnUrls[0]} → ${patch.menu_images[0]}`
      );
    }

    const menuObj =
      row.menu_data && typeof row.menu_data === "object"
        ? { ...row.menu_data }
        : null;
    const embedded =
      menuObj && Array.isArray(menuObj.image_urls)
        ? menuObj.image_urls.map(String)
        : [];
    if (embedded.length > 0 && needsRewrite(embedded)) {
      menuObj.image_urls = rewriteUrls(embedded, publicBase);
      patch.menu_data = menuObj;
      changed = true;
      console.log(
        `${row.slug} (menu_data.image_urls): ${embedded[0]} → ${menuObj.image_urls[0]}`
      );
    }

    if (!changed) continue;

    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from("restaurants")
        .update(patch)
        .eq("id", row.id);
      if (upErr) {
        console.error(`  FAILED ${row.slug}: ${upErr.message}`);
        if (/menu_images/i.test(upErr.message) && patch.menu_images) {
          delete patch.menu_images;
          const { error: retryErr } = await supabase
            .from("restaurants")
            .update(patch)
            .eq("id", row.id);
          if (retryErr) {
            console.error(`  RETRY FAILED: ${retryErr.message}`);
            continue;
          }
        } else {
          continue;
        }
      }
    }
    updated++;
  }

  console.log(
    DRY_RUN
      ? `Would update ${updated} restaurant(s). Re-run without --dry-run to apply.`
      : `Updated ${updated} restaurant(s).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
