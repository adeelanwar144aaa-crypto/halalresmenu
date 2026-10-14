/**
 * Check sitemap URLs: status, content-type, XML parse, URL counts.
 * Usage: node scripts/verify-sitemaps.mjs [baseUrl]
 */
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

function countUrls(xml, kind) {
  if (kind === "index") {
    return (xml.match(/<sitemap>/g) ?? []).length;
  }
  return (xml.match(/<url>/g) ?? []).length;
}

function parseXml(xml) {
  if (!xml.includes("<?xml")) throw new Error("missing xml declaration");
  if (!xml.includes("<urlset") && !xml.includes("<sitemapindex")) {
    throw new Error("missing urlset/sitemapindex root");
  }
  if (/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml)) {
    throw new Error("unescaped ampersand");
  }
}

async function check(url, { xml = true } = {}) {
  const res = await fetch(url, { redirect: "follow" });
  const ct = res.headers.get("content-type") ?? "";
  const cc = res.headers.get("cache-control") ?? "";
  const text = await res.text();
  if (!xml) {
    return {
      url,
      status: res.status,
      ok: res.status === 200,
      ct,
      cc,
    };
  }
  let kind = "urlset";
  if (text.includes("<sitemapindex")) kind = "index";
  try {
    parseXml(text);
  } catch (e) {
    return { url, status: res.status, ok: false, error: String(e.message), ct, cc };
  }
  return {
    url,
    status: res.status,
    ok: res.status === 200 && ct.includes("xml"),
    count: countUrls(text, kind),
    kind,
    ct,
    cc,
  };
}

const apexChecks = [
  `${base}/sitemap.xml`,
  `${base}/sitemap-main.xml`,
  `${base}/sitemaps/cities.xml`,
  `${base}/sitemap-restaurants.xml`,
];

console.log("Base:", base);
const results = [];
results.push(await check(`${base}/robots.txt`, { xml: false }));
for (const url of apexChecks) {
  results.push(await check(url));
}

let childSamples = [];
const indexRes = results.find((r) => r.url.endsWith("/sitemap.xml"));
if (indexRes?.ok) {
  const indexXml = await (await fetch(`${base}/sitemap.xml`)).text();
  const locs = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  childSamples = locs.filter((l) => l.includes(".halalresmenu.com")).slice(0, 3);
  for (const url of childSamples) {
    results.push(await check(url));
  }
}

for (const r of results) {
  console.log(r);
}

const failed = results.filter((r) => !r.ok || r.status !== 200);
process.exit(failed.length ? 1 : 0);
