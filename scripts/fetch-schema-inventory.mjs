const urls = [
  ["home", "https://halalresmenu.com/"],
  ["city", "https://halalresmenu.com/city/london"],
  ["city-cuisine-hub", "https://halalresmenu.com/city/london/pakistani"],
  ["restaurant-overview", "https://7-spices.halalresmenu.com/"],
  ["restaurant-menu", "https://7-spices.halalresmenu.com/menu"],
  ["restaurant-halal-info", "https://7-spices.halalresmenu.com/halal-info"],
  ["restaurant-photos", "https://7-spices.halalresmenu.com/photos"],
  ["about", "https://halalresmenu.com/about"],
  ["contact", "https://halalresmenu.com/contact"],
  ["privacy", "https://halalresmenu.com/privacy"],
  ["404", "https://halalresmenu.com/this-page-does-not-exist-xyz"],
  ["search", "https://halalresmenu.com/search"],
  ["city-index", "https://halalresmenu.com/city"],
];

function extractTypes(obj, out = new Set()) {
  if (!obj || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    for (const x of obj) extractTypes(x, out);
    return out;
  }
  if (obj["@type"]) {
    const t = obj["@type"];
    if (Array.isArray(t)) t.forEach((x) => out.add(x));
    else out.add(t);
  }
  if (obj["@graph"]) extractTypes(obj["@graph"], out);
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") extractTypes(v, out);
  }
  return out;
}

function extractIds(obj, out = new Set()) {
  if (!obj || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    for (const x of obj) extractIds(x, out);
    return out;
  }
  if (typeof obj["@id"] === "string") out.add(obj["@id"]);
  if (obj["@graph"]) extractIds(obj["@graph"], out);
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") extractIds(v, out);
  }
  return out;
}

const ldRe =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

async function main() {
  const report = [];
  for (const [label, url] of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "HalalResMenu-SchemaAudit/1.0" },
      });
      const html = await res.text();
      const blocks = [];
      let m;
      while ((m = ldRe.exec(html))) {
        try {
          blocks.push(JSON.parse(m[1].trim()));
        } catch (e) {
          blocks.push({ parseError: String(e) });
        }
      }
      const micro = /itemscope|itemtype=|typeof=|vocab=/i.test(html);
      const types = new Set();
      const ids = new Set();
      for (const b of blocks) {
        extractTypes(b, types);
        extractIds(b, ids);
      }
      report.push({
        label,
        url,
        status: res.status,
        blocks: blocks.length,
        types: [...types].sort(),
        ids: [...ids].sort(),
        microdata: micro,
        samples: blocks,
      });
    } catch (e) {
      report.push({ label, url, error: String(e) });
    }
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
