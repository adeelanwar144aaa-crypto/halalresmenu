/**
 * Fetch copyright-free city photos from Pexels and save URLs to lib/city-pexels-images.json.
 *
 * Usage:
 *   node scripts/fetch-city-images-pexels.js
 *   node scripts/fetch-city-images-pexels.js --slug=london
 *   node scripts/fetch-city-images-pexels.js --limit=20
 *   node scripts/fetch-city-images-pexels.js --force
 */

const { createClient } = require("@supabase/supabase-js");
const { config } = require("dotenv");
const { resolve } = require("path");
const { readFileSync, writeFileSync, existsSync } = require("fs");

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const OUTPUT = resolve(process.cwd(), "lib/city-pexels-images.json");
const DELAY_MS = 350;

const FEATURED_SLUGS = [
  "london",
  "birmingham",
  "bradford",
  "manchester",
  "leicester",
  "luton",
  "blackburn",
  "oldham",
  "rochdale",
  "dewsbury",
  "glasgow",
  "cardiff",
];

const CITY_SLUG_ALIASES = { "stoke-on-trent": "stoke" };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugifyCity(cityName) {
  return cityName
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveCanonicalCitySlug(citySlug) {
  const normalized = citySlug.toLowerCase().trim();
  return CITY_SLUG_ALIASES[normalized] ?? normalized;
}

function parseArgs() {
  const slugArg = process.argv.find((a) => a.startsWith("--slug="));
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  return {
    slug: slugArg?.split("=")[1]?.trim() || null,
    limit: limitArg ? Number(limitArg.split("=")[1]) : null,
    force: process.argv.includes("--force"),
  };
}

function loadManifest() {
  if (!existsSync(OUTPUT)) return {};
  try {
    return JSON.parse(readFileSync(OUTPUT, "utf8"));
  } catch {
    return {};
  }
}

function saveManifest(data) {
  writeFileSync(OUTPUT, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars in .env.local");
  }
  return createClient(url, serviceKey);
}

async function fetchCitySlugsFromDb() {
  const supabase = createSupabaseClient();
  const bySlug = new Map();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("city")
      .not("city", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const name = String(row.city ?? "").trim();
      if (!name) continue;
      const slug = resolveCanonicalCitySlug(slugifyCity(name));
      if (!slug) continue;
      const existing = bySlug.get(slug);
      if (!existing || name.length > existing.length) {
        bySlug.set(slug, name);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return bySlug;
}

async function searchPexelsCityPhoto(cityName, apiKey) {
  const queries = [
    `${cityName} UK city skyline`,
    `${cityName} United Kingdom city`,
    `${cityName} UK`,
  ];

  for (const query of queries) {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");

    const res = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pexels HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const photo = json.photos?.[0];
    if (!photo?.src?.large) continue;

    return {
      url: photo.src.large2x || photo.src.large,
      photographer: photo.photographer || "Pexels Contributor",
      photographerUrl: photo.photographer_url || "https://www.pexels.com",
      pexelsUrl: photo.url || "https://www.pexels.com",
    };
  }

  return null;
}

async function main() {
  const { slug: singleSlug, limit, force } = parseArgs();
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing PEXELS_API_KEY in .env.local");
  }

  const manifest = loadManifest();
  const dbCities = await fetchCitySlugsFromDb();

  for (const slug of FEATURED_SLUGS) {
    if (!dbCities.has(slug)) {
      dbCities.set(slug, slug.replace(/-/g, " "));
    }
  }

  let entries = [...dbCities.entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (singleSlug) {
    const slug = resolveCanonicalCitySlug(singleSlug);
    const name = dbCities.get(slug) || slug.replace(/-/g, " ");
    entries = [{ slug, name }];
  } else if (limit && Number.isFinite(limit)) {
    entries = entries.slice(0, limit);
  }

  let fetched = 0;
  let skipped = 0;
  let failed = 0;

  for (const { slug, name } of entries) {
    if (!force && manifest[slug]?.url) {
      skipped += 1;
      continue;
    }

    process.stdout.write(`Fetching ${name} (${slug})… `);

    try {
      const photo = await searchPexelsCityPhoto(name, apiKey);
      if (photo) {
        manifest[slug] = photo;
        fetched += 1;
        saveManifest(manifest);
        console.log("saved");
      } else {
        failed += 1;
        console.log("no results");
      }
    } catch (err) {
      failed += 1;
      console.log(`error: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(
    `\nDone. saved=${fetched} skipped=${skipped} failed=${failed} total=${Object.keys(manifest).length}`
  );
  console.log(`Manifest: ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
