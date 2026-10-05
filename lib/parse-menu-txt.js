const TAG_LINES = new Set([
  "vegetarian",
  "vegan",
  "spicy",
  "halal",
  "gluten free",
  "gluten-free",
  "gf",
  "dairy free",
  "dairy-free",
  "contains nuts",
  "nut free",
]);

function parsePriceLine(line) {
  const t = String(line || "").trim();
  if (!t) return null;
  let m = t.match(/^from\s*£?\s*([\d]+(?:\.\d{1,2})?)/i);
  if (m) return Math.round(parseFloat(m[1]) * 100) / 100;
  m = t.match(/^£\s*([\d]+(?:\.\d{1,2})?)/);
  if (m) return Math.round(parseFloat(m[1]) * 100) / 100;
  m = t.match(/^([\d]+(?:\.\d{1,2})?)$/);
  if (m) return Math.round(parseFloat(m[1]) * 100) / 100;
  return null;
}

function stripEmoji(s) {
  return String(s || "").replace(/\p{Extended_Pictographic}/gu, "");
}

function dedupeRepeatedText(text) {
  let t = String(text || "").trim();
  if (!t) return "";
  t = stripEmoji(t).replace(/\s+/g, " ").trim();

  const m = t.match(/^(.+)\1$/);
  if (m) return m[1].trim();

  const half = Math.floor(t.length / 2);
  if (half > 3 && t.slice(0, half) === t.slice(half)) {
    return t.slice(0, half).trim();
  }

  const words = t.split(" ").filter(Boolean);
  const wh = Math.floor(words.length / 2);
  if (wh >= 1 && words.slice(0, wh).join(" ") === words.slice(wh).join(" ")) {
    return words.slice(0, wh).join(" ");
  }

  return t;
}

function isTagLine(line) {
  const t = String(line || "").trim().toLowerCase();
  if (!t) return true;
  if (TAG_LINES.has(t)) return true;
  if (/^vegetarian\b|^vegan\b|^spicy\b|^halal\b|^gluten/.test(t) && t.length < 50) {
    return true;
  }
  if (t.length <= 24 && [...TAG_LINES].some((tag) => t === tag || t.startsWith(`${tag} `))) {
    return true;
  }
  return false;
}

function isCategoryLine(line) {
  const raw = String(line || "").trim();
  const t = dedupeRepeatedText(raw);
  if (!t || parsePriceLine(t) != null) return false;
  if (t.length > 80) return false;
  if (t.split(",").length > 2) return false;
  if (isTagLine(t)) return false;

  if (raw !== t && t.length >= 3 && t.length <= 80) return true;
  if (raw.match(/^(.+?)!+\1!*$/i)) return true;

  const half = Math.floor(t.length / 2);
  if (half >= 4 && t.slice(0, half) === t.slice(half)) return true;

  return false;
}

function categoryNameFromLine(line) {
  let name = dedupeRepeatedText(line);
  name = name.replace(/!+$/g, "").trim();
  const bangDouble = String(line || "").trim().match(/^(.+?)!+\1!*$/i);
  if (bangDouble) name = bangDouble[1].trim();
  return name.replace(/!+$/g, "").trim() || "Menu";
}

function categoryKey(name) {
  return categoryNameFromLine(name).toLowerCase().replace(/!+$/g, "").trim();
}

function isJunkLine(line) {
  const t = String(line || "").trim();
  if (!t) return true;
  if (/^#+/.test(t)) return true;
  if (/^menu\s*\d*$/i.test(t)) return true;
  return false;
}

function mergeCategories(categories) {
  const byKey = new Map();
  for (const cat of categories) {
    const key = categoryKey(cat.name);
    if (!byKey.has(key)) {
      byKey.set(key, { name: categoryNameFromLine(cat.name), items: [] });
    }
    byKey.get(key).items.push(...cat.items);
  }
  return [...byKey.values()].filter((c) => c.items.length > 0);
}

function parseMenuTxt(raw, opts = {}) {
  const lines = String(raw || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !isJunkLine(l));

  if (lines.length === 0) {
    return { ok: false, reason: "empty" };
  }

  let start = 0;
  if (
    opts.restaurantName &&
    lines[0].toLowerCase() === String(opts.restaurantName).trim().toLowerCase()
  ) {
    start = 1;
  }

  const categories = [];
  let currentCategory = "Menu";
  let sawCategoryHeading = false;

  function ensureCategory(name) {
    const display = categoryNameFromLine(name);
    const key = categoryKey(display);
    let cat = categories.find((c) => categoryKey(c.name) === key);
    if (!cat) {
      cat = { name: display, items: [] };
      categories.push(cat);
    }
    return cat;
  }

  ensureCategory(currentCategory);

  function looksLikeNewItem(idx) {
    if (idx + 1 >= lines.length) return false;
    if (isCategoryLine(lines[idx]) || isTagLine(lines[idx])) return false;
    return parsePriceLine(lines[idx + 1]) != null;
  }

  for (let i = start; i < lines.length; ) {
    const line = lines[i];

    if (isTagLine(line)) {
      i += 1;
      continue;
    }

    if (isCategoryLine(line)) {
      sawCategoryHeading = true;
      currentCategory = categoryNameFromLine(line);
      ensureCategory(currentCategory);
      i += 1;
      continue;
    }

    if (looksLikeNewItem(i)) {
      const name = dedupeRepeatedText(line);
      if (!name || isTagLine(name)) {
        i += 1;
        continue;
      }

      const price = parsePriceLine(lines[i + 1]);
      i += 2;

      const descParts = [];
      while (i < lines.length && !isCategoryLine(lines[i]) && !looksLikeNewItem(i)) {
        if (!isTagLine(lines[i])) {
          const cleaned = dedupeRepeatedText(lines[i]);
          if (
            cleaned &&
            cleaned.toLowerCase() !== name.toLowerCase() &&
            parsePriceLine(cleaned) == null &&
            !isTagLine(cleaned)
          ) {
            descParts.push(cleaned);
          }
        }
        i += 1;
      }

      const description = descParts.length
        ? descParts.join(" ").slice(0, 500)
        : "";

      if (!isTagLine(name)) {
        ensureCategory(currentCategory).items.push({
          name,
          description,
          price: price != null && Number.isFinite(price) ? price : null,
        });
      }
      continue;
    }

    i += 1;
  }

  let withItems = mergeCategories(categories.filter((c) => c.items.length > 0));

  withItems = withItems
    .map((c) => ({
      ...c,
      items: c.items.filter((it) => !isTagLine(it.name)),
    }))
    .filter((c) => c.items.length > 0);

  if (!sawCategoryHeading && withItems.length > 1) {
    const merged = [];
    for (const c of withItems) merged.push(...c.items);
    withItems = [{ name: "Menu", items: merged }];
  }

  const totalItems = withItems.reduce((n, c) => n + c.items.length, 0);

  if (totalItems === 0) {
    return { ok: false, reason: "no_items", itemCount: 0 };
  }

  return {
    ok: true,
    itemCount: totalItems,
    menuData: {
      source: "restaurant_menu",
      categories: withItems,
    },
  };
}

module.exports = {
  parseMenuTxt,
  parsePriceLine,
  isTagLine,
  categoryNameFromLine,
};
