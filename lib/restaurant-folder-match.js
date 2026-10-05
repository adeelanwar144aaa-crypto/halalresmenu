const fs = require("fs");
const stringSimilarity = require("string-similarity");

const STOP_WORDS = new Set(["restaurant", "ltd", "the", "takeaway"]);
const FUZZY_THRESHOLD = 0.85;

function fixMojibake(input) {
  let s = String(input ?? "");
  if (!/[ÃÂâÅŸ€�]/.test(s)) return s;
  try {
    const fixed = Buffer.from(s, "latin1").toString("utf8");
    if (fixed && fixed !== s) return fixed;
  } catch {
    /* keep original */
  }
  return s
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/Ã©/g, "é")
    .replace(/ÅŸ/g, "ş")
    .replace(/Ã¼/g, "ü")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã§/g, "ç");
}

function stripAccents(s) {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function normalizeName(input) {
  let s = fixMojibake(String(input ?? "").trim());
  s = stripAccents(s).toLowerCase();
  s = s.replace(/&/g, " and ");
  s = s.replace(/[''`]/g, "");
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOP_WORDS.has(w))
    .join(" ");
  return s.replace(/\s+/g, " ").trim();
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function loadManualMap(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return map;
  const header = parseCsvLine(lines[0]);
  const folderIdx = header.indexOf("folder_name");
  const slugIdx = header.indexOf("chosen_slug");
  if (folderIdx < 0 || slugIdx < 0) return map;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const folder = cols[folderIdx]?.replace(/^"|"$/g, "");
    const slug = cols[slugIdx]?.replace(/^"|"$/g, "");
    if (folder && slug) map.set(folder, slug);
  }
  return map;
}

function ensureManualMapHeader(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      "folder_name,candidate_slugs,chosen_slug\n",
      "utf8"
    );
    return;
  }
}

function appendManualMapRow(filePath, folderName, candidateSlugs) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  fs.appendFileSync(
    filePath,
    `${esc(folderName)},${esc(candidateSlugs)},""\n`,
    "utf8"
  );
}

function hasNoRealPhotos(photos) {
  if (!photos || !Array.isArray(photos) || photos.length === 0) return true;
  return photos.every((u) =>
    /googleapis\.com|googleusercontent/i.test(String(u))
  );
}

function extractMenuTxtHints(menuTxt, folderName) {
  const hints = {
    title: null,
    postcode: null,
    phone: null,
    address: null,
    city: null,
  };
  if (!menuTxt) return hints;

  const lines = String(menuTxt)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length) {
    hints.title = fixMojibake(lines[0]);
  }

  const head = lines.slice(0, 25).join("\n");
  const pc = head.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i);
  if (pc) hints.postcode = pc[1];

  const phone = head.match(
    /(?:\+44|0)\s*\d[\d\s]{8,12}\d|\b0\d{10,11}\b/
  );
  if (phone) hints.phone = phone[0].replace(/\s+/g, "");

  for (const line of lines.slice(0, 15)) {
    if (line.length > 20 && /,\s*[A-Z]{1,2}\d/.test(line)) {
      hints.address = line;
      break;
    }
  }

  return hints;
}

function buildRestaurantIndex(restaurants) {
  const byExactName = new Map();
  const byNormalized = new Map();
  const bySlug = new Map();
  const cities = new Set();
  const chainCityCount = new Map();

  for (const r of restaurants) {
    bySlug.set(r.slug, r);
    cities.add(r.city);

    const exact = String(r.name ?? "").trim();
    if (!byExactName.has(exact)) byExactName.set(exact, []);
    byExactName.get(exact).push(r);

    const norm = normalizeName(r.name);
    if (!norm) continue;
    if (!byNormalized.has(norm)) byNormalized.set(norm, []);
    byNormalized.get(norm).push(r);

    const chainKey = norm.split(" ").slice(0, 3).join(" ");
    if (!chainCityCount.has(chainKey)) chainCityCount.set(chainKey, new Set());
    if (r.city) chainCityCount.get(chainKey).add(normalizeName(r.city));
  }

  const chainMultiCity = new Set();
  for (const [key, citySet] of chainCityCount.entries()) {
    if (citySet.size >= 3) chainMultiCity.add(key);
  }

  const cityList = [...cities]
    .filter(Boolean)
    .sort((a, b) => normalizeName(b).length - normalizeName(a).length);

  return { byExactName, byNormalized, bySlug, cityList, chainMultiCity };
}

function extractCityFromFolder(folderName, cityList) {
  const normFolder = normalizeName(folderName);
  for (const city of cityList) {
    const nc = normalizeName(city);
    if (!nc || nc.length < 3) continue;
    if (normFolder === nc) continue;
    if (normFolder.endsWith(` ${nc}`) || normFolder.endsWith(nc)) {
      return city;
    }
    if (normFolder.includes(` ${nc} `) || normFolder.includes(` ${nc}`)) {
      return city;
    }
  }
  return null;
}

function pickByCity(candidates, cityHint) {
  if (!cityHint || candidates.length <= 1) return candidates;
  const nc = normalizeName(cityHint);
  const filtered = candidates.filter((r) => normalizeName(r.city) === nc);
  return filtered.length ? filtered : candidates;
}

function mergeHints(...hintObjs) {
  const out = {
    postcode: null,
    googlePlaceId: null,
    address: null,
    phone: null,
    title: null,
  };
  for (const h of hintObjs) {
    if (!h) continue;
    for (const k of Object.keys(out)) {
      if (!out[k] && h[k]) out[k] = h[k];
    }
  }
  return out;
}

function parseMetadataHints(metadataFiles) {
  const hints = { postcode: null, googlePlaceId: null, address: null, phone: null };
  for (const { text } of metadataFiles || []) {
    const raw = text || "";
    try {
      const j = JSON.parse(raw);
      hints.postcode = hints.postcode || j.postcode || j.post_code || null;
      hints.googlePlaceId =
        hints.googlePlaceId || j.google_place_id || j.googlePlaceId || null;
      hints.address = hints.address || j.address || null;
      hints.phone = hints.phone || j.phone || null;
    } catch {
      const pc = raw.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i);
      if (pc) hints.postcode = pc[1];
    }
  }
  return hints;
}

function disambiguateWithHints(candidates, hints) {
  let pool = [...candidates];
  if (hints.googlePlaceId) {
    const g = pool.filter((r) => r.google_place_id === hints.googlePlaceId);
    if (g.length === 1) return g[0];
    if (g.length) pool = g;
  }
  if (hints.postcode) {
    const pc = hints.postcode.replace(/\s+/g, "").toUpperCase();
    const p = pool.filter(
      (r) =>
        String(r.postcode || "")
          .replace(/\s+/g, "")
          .toUpperCase() === pc
    );
    if (p.length === 1) return p[0];
    if (p.length) pool = p;
  }
  if (hints.phone) {
    const ph = hints.phone.replace(/\D/g, "").slice(-10);
    const p = pool.filter((r) =>
      String(r.phone || "")
        .replace(/\D/g, "")
        .includes(ph)
    );
    if (p.length === 1) return p[0];
    if (p.length) pool = p;
  }
  if (hints.address && pool.length > 1) {
    const addrNorm = normalizeName(hints.address);
    const scored = pool
      .map((r) => ({
        r,
        score: stringSimilarity.compareTwoStrings(
          addrNorm,
          normalizeName(r.address || "")
        ),
      }))
      .sort((a, b) => b.score - a.score);
    if (scored[0]?.score >= 0.55) return scored[0].r;
  }
  if (hints.title && pool.length > 1) {
    const tNorm = normalizeName(hints.title);
    const scored = pool
      .map((r) => ({
        r,
        score: stringSimilarity.compareTwoStrings(tNorm, normalizeName(r.name)),
      }))
      .sort((a, b) => b.score - a.score);
    if (scored[0]?.score >= 0.72) return scored[0].r;
  }
  const noPhotos = pool.filter((r) => hasNoRealPhotos(r.photos));
  if (noPhotos.length === 1) return noPhotos[0];
  return pool.length === 1 ? pool[0] : null;
}

function menuConfirmsRow(folderName, menuTxt, row, cityHint) {
  const hints = mergeHints(
    extractMenuTxtHints(menuTxt, folderName),
    { city: cityHint }
  );
  if (cityHint && normalizeName(row.city) === normalizeName(cityHint)) {
    return true;
  }
  if (
    hints.postcode &&
    String(row.postcode || "")
      .replace(/\s+/g, "")
      .toUpperCase() === hints.postcode.replace(/\s+/g, "").toUpperCase()
  ) {
    return true;
  }
  if (hints.title) {
    const score = stringSimilarity.compareTwoStrings(
      normalizeName(hints.title),
      normalizeName(row.name)
    );
    if (score >= 0.72) return true;
    const folderScore = stringSimilarity.compareTwoStrings(
      normalizeName(folderName),
      normalizeName(row.name)
    );
    if (folderScore >= 0.85) return true;
  }
  return false;
}

function isChainName(normName, index) {
  const chainKey = normName.split(" ").slice(0, 3).join(" ");
  return index.chainMultiCity.has(chainKey);
}

function formatCandidates(candidates) {
  return candidates.map((r) => `${r.slug} (${r.city || "?"})`).join("|");
}

function matchFromMenuTxtOnly(folderName, menuTxt, index) {
  const hints = extractMenuTxtHints(menuTxt, folderName);
  const all = [];
  for (const rows of index.byNormalized.values()) all.push(...rows);

  if (hints.postcode) {
    const pc = hints.postcode.replace(/\s+/g, "").toUpperCase();
    const hit = all.filter(
      (r) =>
        String(r.postcode || "")
          .replace(/\s+/g, "")
          .toUpperCase() === pc
    );
    if (hit.length === 1) return { type: "matched", row: hit[0], via: "menu-postcode" };
  }

  if (hints.title) {
    const tNorm = normalizeName(hints.title);
    let best = null;
    let bestScore = 0;
    for (const r of all) {
      const score = stringSimilarity.compareTwoStrings(tNorm, normalizeName(r.name));
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }
    if (best && bestScore >= 0.88) {
      return { type: "matched", row: best, via: "menu-title" };
    }
  }

  return { type: "unmatched", reason: "menu-hints-no-match" };
}

function matchFolderToRestaurant({
  folderName,
  menuTxt,
  metadataFiles,
  index,
  manualSlug,
}) {
  if (manualSlug) {
    const row = index.bySlug.get(manualSlug);
    if (row) return { type: "matched", row, via: "manual-map" };
    return { type: "unmatched", reason: "manual slug not found" };
  }

  const cityHint = extractCityFromFolder(folderName, index.cityList);
  const menuHints = extractMenuTxtHints(menuTxt, folderName);
  const hints = mergeHints(parseMetadataHints(metadataFiles), menuHints);

  const exact = index.byExactName.get(folderName.trim());
  if (exact?.length === 1) {
    return { type: "matched", row: exact[0], via: "exact-name" };
  }

  const normFolder = normalizeName(folderName);
  const normHits = index.byNormalized.get(normFolder) || [];
  let candidates = normHits.length ? [...normHits] : exact ? [...exact] : [];

  if (candidates.length > 1) {
    candidates = pickByCity(candidates, cityHint);
  }

  if (candidates.length === 1) {
    return { type: "matched", row: candidates[0], via: "normalized-name" };
  }

  if (candidates.length > 1) {
    const picked = disambiguateWithHints(candidates, hints);
    if (picked) {
      return { type: "matched", row: picked, via: "disambiguated" };
    }
    return { type: "ambiguous", candidates };
  }

  const normTitle = menuHints.title ? normalizeName(menuHints.title) : "";
  if (normTitle) {
    const titleHits = index.byNormalized.get(normTitle) || [];
    if (titleHits.length === 1) {
      return { type: "matched", row: titleHits[0], via: "menu-title-exact" };
    }
    if (titleHits.length > 1) {
      const picked = disambiguateWithHints(
        pickByCity(titleHits, cityHint),
        hints
      );
      if (picked) return { type: "matched", row: picked, via: "menu-title-disambig" };
    }
  }

  let fuzzyPool = [];
  if (cityHint) {
    const nc = normalizeName(cityHint);
    for (const [norm, rows] of index.byNormalized.entries()) {
      for (const r of rows) {
        if (normalizeName(r.city) === nc) fuzzyPool.push({ norm, row: r });
      }
    }
  } else {
    for (const [norm, rows] of index.byNormalized.entries()) {
      for (const r of rows) fuzzyPool.push({ norm, row: r });
    }
  }

  const ratings = fuzzyPool.map(({ norm, row }) => ({
    row,
    norm,
    rating: stringSimilarity.compareTwoStrings(normFolder, norm),
  }));
  ratings.sort((a, b) => b.rating - a.rating);
  const best = ratings[0];

  if (best && best.rating >= FUZZY_THRESHOLD) {
    const chain = isChainName(best.norm, index);
    const sameCity =
      cityHint && normalizeName(best.row.city) === normalizeName(cityHint);
    const confirmed = menuConfirmsRow(folderName, menuTxt, best.row, cityHint);

    if (chain && !sameCity && !confirmed) {
      return {
        type: "fuzzy_rejected",
        row: best.row,
        score: best.rating,
        reason: "chain-without-city-confirmation",
      };
    }
    if (sameCity || confirmed) {
      return {
        type: "fuzzy",
        row: best.row,
        score: best.rating,
        reason: sameCity ? "same-city" : "menu-confirmed",
      };
    }
    return {
      type: "fuzzy_rejected",
      row: best.row,
      score: best.rating,
      reason: "no-city-or-menu-confirmation",
    };
  }

  const menuOnly = matchFromMenuTxtOnly(folderName, menuTxt, index);
  if (menuOnly.type === "matched") return menuOnly;

  return { type: "unmatched" };
}

module.exports = {
  normalizeName,
  fixMojibake,
  loadManualMap,
  ensureManualMapHeader,
  appendManualMapRow,
  buildRestaurantIndex,
  extractCityFromFolder,
  extractMenuTxtHints,
  parseMetadataHints,
  mergeHints,
  disambiguateWithHints,
  pickByCity,
  matchFolderToRestaurant,
  formatCandidates,
  hasNoRealPhotos,
  FUZZY_THRESHOLD,
};
