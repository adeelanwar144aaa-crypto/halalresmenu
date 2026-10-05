const path = require("path");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);
const PDF_EXT = new Set([".pdf"]);

const METADATA_NAMES = new Set([
  "metadata.json",
  "meta.json",
  "info.json",
  "restaurant.json",
]);

/**
 * Classify a file under a restaurant folder.
 * @returns {"menu_txt"|"menu_image"|"restaurant_photo"|"menu_pdf"|"metadata"|"ignore"}
 */
function classifyRelativePath(relativePath) {
  const rel = relativePath.replace(/\\/g, "/");
  const fileName = path.basename(rel);
  const ext = path.extname(fileName).toLowerCase();
  const lower = fileName.toLowerCase();
  const relLower = rel.toLowerCase();

  if (lower === "menu.txt") return "menu_txt";
  if (METADATA_NAMES.has(lower)) return "metadata";
  if (PDF_EXT.has(ext)) return "menu_pdf";

  if (!IMAGE_EXT.has(ext)) return "ignore";

  const inPhotosDir =
    relLower.startsWith("photos/") ||
    relLower.includes("/photos/") ||
    relLower.startsWith("photo/") ||
    relLower.includes("/photo/");

  if (inPhotosDir) return "restaurant_photo";

  if (
    /(^|\/)(photo|photos|cover|facade|storefront|exterior|interior|logo)[-_.]/i.test(
      relLower
    ) ||
    /^(photo|cover|facade|storefront|exterior|interior|logo)[-_.]/i.test(lower)
  ) {
    return "restaurant_photo";
  }

  const inMenuDir =
    relLower.startsWith("menu/") ||
    relLower.includes("/menu/") ||
    /^menu[-_.]/i.test(lower);

  if (inMenuDir) return "menu_image";

  if (/^menu/i.test(lower) && lower !== "menu.txt") return "menu_image";

  // Numbered files in zip folders are restaurant photos (venue/scene shots).
  if (/^\d+\./.test(lower)) return "restaurant_photo";

  return "restaurant_photo";
}

function emptyBucket() {
  return {
    menuTxt: null,
    metadataFiles: [],
    restaurantPhotos: [],
    menuImages: [],
    menuPdfs: [],
  };
}

function imageSortKey(filename) {
  const base = path.basename(filename, path.extname(filename));
  const n = parseInt(base, 10);
  return Number.isFinite(n) ? n : 9999;
}

function sortBucket(bucket) {
  bucket.restaurantPhotos.sort(
    (a, b) => imageSortKey(a.name) - imageSortKey(b.name)
  );
  bucket.menuImages.sort((a, b) => imageSortKey(a.name) - imageSortKey(b.name));
  bucket.menuPdfs.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  IMAGE_EXT,
  PDF_EXT,
  classifyRelativePath,
  emptyBucket,
  sortBucket,
  imageSortKey,
};
