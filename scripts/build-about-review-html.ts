/**
 * Embeds all scripts/drafts/*.json into review.html + index.html (local preview links).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { DRAFTS_DIR, listAboutDraftFiles } from "@/lib/about-draft";
import { restaurantSubdomainUrl } from "@/lib/utils";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function main() {
  const drafts = listAboutDraftFiles();
  const embedded = JSON.stringify(drafts);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>About content review — halalresmenu</title>
  <style>
    :root { --fail: #b91c1c; --pass: #15803d; --border: #e4e4e7; --muted: #71717a; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; background: #fafafa; color: #18181b; }
    header { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid var(--border); padding: 12px 20px; }
    header h1 { margin: 0 0 8px; font-size: 1.15rem; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .toolbar input[type=search] { flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; }
    .toolbar label { font-size: 0.875rem; display: flex; align-items: center; gap: 6px; }
    .stats { font-size: 0.875rem; color: var(--muted); }
    main { max-width: 48rem; margin: 0 auto; padding: 20px; }
    .card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
    .card.fail { border-color: #fecaca; }
    .card-header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
    .card-header h2 { margin: 0; font-size: 1.25rem; }
    .badge { font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; }
    .badge.pass { background: #dcfce7; color: var(--pass); }
    .badge.fail { background: #fee2e2; color: var(--fail); }
    .meta-block { font-size: 0.875rem; margin: 12px 0; padding: 12px; background: #f4f4f5; border-radius: 8px; }
    .meta-block dt { font-weight: 600; margin-top: 8px; }
    .meta-block dt:first-child { margin-top: 0; }
    .meta-block dd { margin: 4px 0 0; color: #3f3f46; }
    .len { color: var(--muted); font-weight: normal; }
    .reasons { font-size: 0.8125rem; color: var(--fail); margin: 8px 0 0; padding-left: 1.2rem; }
    .article { margin-top: 16px; }
    .article .intro { line-height: 1.65; color: #3f3f46; margin-bottom: 1.5rem; }
    .article h3 { font-size: 1.35rem; margin: 2rem 0 0.75rem; color: #18181b; }
    .article p { line-height: 1.65; color: #3f3f46; margin: 0.75rem 0; }
    details.source { margin-top: 20px; border: 1px solid var(--border); border-radius: 8px; padding: 0 12px 12px; }
    details.source summary { cursor: pointer; font-weight: 600; padding: 12px 0; }
    details.source pre { white-space: pre-wrap; word-break: break-word; font-size: 0.75rem; background: #f4f4f5; padding: 12px; border-radius: 6px; max-height: 400px; overflow: auto; }
    .hidden { display: none !important; }
    .empty { text-align: center; padding: 48px; color: var(--muted); }
  </style>
</head>
<body>
  <header>
    <h1>About content review</h1>
    <div class="toolbar">
      <input type="search" id="q" placeholder="Search name, city, slug…" autocomplete="off" />
      <label><input type="checkbox" id="failOnly" /> FAIL only</label>
      <span class="stats" id="stats"></span>
    </div>
  </header>
  <main id="main"></main>
  <script type="application/json" id="draft-data">${embedded.replace(/</g, "\\u003c")}</script>
  <script>
    const drafts = JSON.parse(document.getElementById("draft-data").textContent);
    const main = document.getElementById("main");
    const q = document.getElementById("q");
    const failOnly = document.getElementById("failOnly");
    const stats = document.getElementById("stats");

    function esc(s) {
      if (s == null) return "";
      return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    function renderArticle(d) {
      if (!d.intro && !(d.sections && d.sections.length)) {
        return '<p class="intro"><em>No generated article' + (d.error ? " — " + esc(d.error) : "") + '</em></p>';
      }
      let h = '<div class="article"><p class="intro">' + esc(d.intro || "") + '</p>';
      for (const s of d.sections || []) {
        h += '<h3>' + esc(s.heading) + '</h3>';
        for (const para of (s.body || "").split(/\\n\\n+/)) {
          if (para.trim()) h += '<p>' + esc(para.trim()) + '</p>';
        }
      }
      h += '</div>';
      return h;
    }

    function render() {
      const term = q.value.trim().toLowerCase();
      const onlyFail = failOnly.checked;
      let visible = 0;
      main.innerHTML = "";
      if (!drafts.length) {
        main.innerHTML = '<div class="empty">No drafts yet. Run npm run generate:about:batch</div>';
        stats.textContent = "";
        return;
      }
      for (const d of drafts) {
        const pass = d.quality && d.quality.pass;
        if (onlyFail && pass) continue;
        const hay = [d.slug, d.name, d.city, d.cuisine_type].join(" ").toLowerCase();
        if (term && !hay.includes(term)) continue;
        visible++;
        const card = document.createElement("article");
        card.className = "card" + (pass ? "" : " fail");
        card.dataset.slug = d.slug;
        const mt = d.meta_title || "";
        const md = d.meta_description || "";
        let reasons = "";
        if (d.quality && d.quality.reasons && d.quality.reasons.length) {
          reasons = "<ul class=\\"reasons\\">" + d.quality.reasons.map(r => "<li>" + esc(r) + "</li>").join("") + "</ul>";
        }
        const menuJson = d.source && d.source.menu_json != null
          ? JSON.stringify(d.source.menu_json, null, 2)
          : "";
        card.innerHTML =
          '<div class="card-header">' +
            '<h2>' + esc(d.name) + ' <span class="len">(' + esc(d.city || "—") + ')</span></h2>' +
            '<span class="badge ' + (pass ? "pass" : "fail") + '">' + (pass ? "PASS" : "FAIL") + '</span>' +
          '</div>' +
          '<p class="len"><code>' + esc(d.slug) + '</code> · ' + (d.wordCount || 0) + ' words</p>' +
          reasons +
          '<dl class="meta-block">' +
            '<dt>Meta title <span class="len">(' + mt.length + ' chars)</span></dt><dd>' + esc(mt) + '</dd>' +
            '<dt>Meta description <span class="len">(' + md.length + ' chars)</span></dt><dd>' + esc(md) + '</dd>' +
          '</dl>' +
          renderArticle(d) +
          '<details class="source"><summary>Source: about.txt &amp; menu</summary>' +
            '<p><strong>about.txt</strong></p><pre>' + esc((d.source && d.source.about_raw) || "") + '</pre>' +
            '<p><strong>menu_data</strong></p><pre>' + esc(menuJson) + '</pre>' +
          '</details>';
        main.appendChild(card);
      }
      const passN = drafts.filter(x => x.quality && x.quality.pass).length;
      stats.textContent = visible + " shown · " + drafts.length + " drafts · " + passN + " PASS · " + (drafts.length - passN) + " FAIL";
      if (visible === 0) main.innerHTML = '<div class="empty">No matches</div>';
    }

    q.addEventListener("input", render);
    failOnly.addEventListener("change", render);
    render();
  </script>
</body>
</html>`;

  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  const out = path.join(DRAFTS_DIR, "review.html");
  fs.writeFileSync(out, html, "utf8");
  console.log(`Wrote ${out} (${drafts.length} drafts)`);

  const indexRows = drafts
    .map((d) => {
      const pass = d.quality?.pass;
      const badge = pass
        ? `<span class="pass">PASS</span>`
        : `<span class="fail">FAIL</span>`;
      const url = restaurantSubdomainUrl(d.slug);
      return `<tr>
        <td><a href="${escapeHtml(url)}">${escapeHtml(d.name)}</a></td>
        <td>${escapeHtml(d.city || "—")}</td>
        <td><code>${escapeHtml(d.slug)}</code></td>
        <td>${d.wordCount ?? 0}</td>
        <td>${badge}</td>
        <td><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></td>
      </tr>`;
    })
    .join("\n");

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Draft preview index — halalresmenu</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; max-width: 960px; }
    h1 { font-size: 1.25rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e4e4e7; }
    .pass { color: #15803d; font-weight: 700; }
    .fail { color: #b91c1c; font-weight: 700; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Draft preview on localhost</h1>
  <p>Set <code>PREVIEW_DRAFTS=true</code> and open subdomain links below (requires <code>npm run dev</code>).</p>
  <p><a href="review.html">Full review page</a> · ${drafts.length} drafts</p>
  <table>
    <thead><tr><th>Name</th><th>City</th><th>Slug</th><th>Words</th><th>Check</th><th>Local URL</th></tr></thead>
    <tbody>
${indexRows || "<tr><td colspan=6>No drafts yet</td></tr>"}
    </tbody>
  </table>
</body>
</html>`;
  const indexOut = path.join(DRAFTS_DIR, "index.html");
  fs.writeFileSync(indexOut, indexHtml, "utf8");
  console.log(`Wrote ${indexOut}`);
}

main();
