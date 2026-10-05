# HalalResMenu SEO Audit (2026-10-05)

Site: **https://halalresmenu.com** · Stack: Next.js 15 (App Router) on Cloudflare Pages + Worker · Data: Supabase (~4,155 restaurants).

## Page types covered

| Type | Route pattern | Notes |
|------|---------------|--------|
| Home | `halalresmenu.com/` | Single H1, search hero |
| City index | `/city` | Lists all city hubs |
| City hub | `/city/[citySlug]` | Primary local SEO landing |
| Search | `/search` | Query param `q` |
| Restaurant overview | `{slug}.halalresmenu.com/` | Subdomain canonical model |
| Menu | `{slug}.halalresmenu.com/menu` | Structured menu + JSON-LD Menu |
| Halal info | `{slug}.halalresmenu.com/halal-info` | Certification / policies |
| Static | `/about`, `/contact`, `/privacy`, `/terms-conditions` | Canonical + metadata |
| 404 | `not-found.tsx` | Custom UI; invalid subdomains → 404 |
| **Cuisine pages** | — | **Not implemented** (cuisines linked from home sections only) |

---

## 1. Crawl & indexing

### robots.txt
- Served at `/robots.txt` (edge route).
- **Allow: /** for major bots; does not block CSS/JS/images.
- **Sitemap:** apex → `https://halalresmenu.com/sitemap.xml`; each restaurant subdomain → own `sitemap.xml`.

### Sitemaps
- **Index:** `/sitemap.xml` lists `sitemap-main.xml`, `sitemaps/cities.xml`, and **one sitemap per restaurant subdomain** (~4k+ child sitemaps — acceptable; under 50k URL limit per file).
- Each restaurant sitemap: overview, `/menu`, `/halal-info`.
- **Issue (fixed):** `<lastmod>` was set to “now” on every generation for cities/main — misleading for crawlers.
- **Issue (fixed):** Preview hosts (`*.pages.dev`) were not forced noindex at the edge.

### Canonicals
- Restaurant pages: `createPageMetadata` → absolute subdomain URLs (`https://{slug}.halalresmenu.com/...`).
- Apex pages: explicit `alternates.canonical` on city/static/search/home (home canonical added in fix pass).
- **www → non-www:** 301 redirect added in middleware for apex.

### Duplicates / staging
- **Risk:** `halalresmenu.pages.dev` and branch previews could be indexed.
- **Fix:** `X-Robots-Tag: noindex, nofollow` on any host that is not production apex or `{slug}.halalresmenu.com`.

### Redirects
- Apex `/{slug}` → `{slug}.halalresmenu.com` (301) in production.
- Legacy paths via `legacy-redirects.ts`.
- `/city/[slug]/all` → canonical city hub.

### Thin content (Supabase scan)
- **1,335 / 4,155** restaurants with **no usable photos** and **no real menu** (no `restaurant_menu`, &lt;3 parsed items).
- **Recommendation:** noindex or consolidate — **not applied** (needs product decision).

### Internal links
- Home → cities, cuisines (anchors), search.
- Restaurant → menu, halal-info, nearby listings (components).
- **Gap:** visible HTML breadcrumbs on all page types are limited; **BreadcrumbList JSON-LD** present on restaurant tabs.

---

## 2. On-page (sample + templates)

### Titles & descriptions
- Restaurants: unique per slug via `MetaTags.tsx` (name + cuisine/area + “halal” in body copy).
- Many titles include “Updated 2026” (long; often **&gt;60 chars** — cosmetic, not blocking).
- City pages: generated from `generateMetadata` + SEO stats.
- **Duplicate risk:** low — hash-based description variants per slug.

### Headings
- Home: one H1.
- Restaurant overview: H1 in hero; sections use H2 via `SectionHeading`.
- Menu page: dedicated menu H1.

### Images
- Gallery uses direct `<img>` for R2 WebP (appropriate on Cloudflare; `next/image` optimization limited on Pages).
- **Fix:** alt text pattern `{Name} in {City} – photo N`.

### Open Graph / Twitter
- Restaurant pages: `ogImage` from first gallery photo when available.
- Home: OG URL/canonical added.

---

## 3. Structured data

### Restaurant (overview / menu)
- `@type`: Restaurant, FoodEstablishment, LocalBusiness.
- address, geo, telephone, servesCuisine, openingHoursSpecification when data exists.
- **Fix:** `image` array from R2/Google photo URLs; `dateModified` when content refresh detected.
- `hasMenu` + full `Menu` / `MenuSection` / `MenuItem` with `offers.price` (GBP) on menu page when `menu_data` parsed.
- **aggregateRating / Review:** only when Google rating + review count exist (not fabricated).

### FAQ
- FAQPage on overview when `includeFaq` (visible FAQ content aligned).

### Home
- **Fix:** Organization + WebSite with SearchAction (`/search?q={search_term_string}`).

### BreadcrumbList
- On restaurant overview, menu, halal-info.

---

## 4. Mobile & Core Web Vitals (Lighthouse mobile, production **before** code deploy)

| Page | Perf | SEO | A11y | Best Pr. | LCP | CLS | TBT |
|------|-----:|----:|-----:|---------:|-----|-----|-----|
| Home | 68 | 100 | 100 | 100 | 3.1s | 0 | 1,070ms |
| City (London) | 27 | 100 | 96 | 79 | 12.3s | 0.003 | 2,440ms |
| Restaurant (7-spices) | 53 | 100 | 97 | 96 | 4.1s | 0 | 730ms |
| Menu (7-spices) | 74 | 100 | 93 | 96 | 2.8s | 0 | 830ms |

**Notes:**
- SEO scores already 100 on sampled URLs; fixes target indexing safety, freshness signals, and schema completeness.
- City hub **performance** is the main weakness (large lists, TBT) — needs dedicated perf work, not changed in this pass.
- Viewport: Next.js default; body font from theme (Switzer) — verify ≥16px on mobile in follow-up.

---

## 5. Technical

| Item | Status |
|------|--------|
| `lang` on `<html>` | **Fix:** `en-GB` |
| Security headers (HSTS, nosniff, Referrer-Policy, X-Frame-Options) | **Fix:** middleware + Worker wrapper |
| Custom 404 | Present (`not-found.tsx`) |
| Cache | Edge cache in Worker; sitemap TTL 3600s |
| R2 env at build | Optional; `*.r2.dev` always allowed in `next.config.ts` |

---

## Fixes shipped in this pass (code)

1. Preview / non-production **noindex** (`lib/production-host.ts`, middleware, Worker).
2. **www → apex** 301.
3. **Security headers** on all responses.
4. Sitemap **lastmod** from real restaurant/city update times (`lib/restaurant-freshness.ts`, `lib/sitemap-data.ts`).
5. JSON-LD **image**, **dateModified**; visible **Last updated** only after R2/menu refresh.
6. Home **Organization + WebSite** JSON-LD; home **canonical** + OG.
7. Photo **alt** text includes city.

---

## Recommendations (need your decision)

1. **Thin listings (1,335):** noindex, hide from sitemap, or enrich — do not mass-delete without editorial rules.
2. **Dedicated cuisine hub URLs** (e.g. `/cuisine/indian`) — not built; home sections only.
3. **Visible breadcrumbs** on city + restaurant pages (UI component).
4. **City page performance:** reduce JS/hydration on long lists (separate perf sprint).
5. **`images_uploaded_at` column** in Supabase for precise freshness (optional migration).
6. Title length tuning (50–60 chars) without losing brand — batch copy review.

---

## Google Search Console (manual)

1. Property: **https://halalresmenu.com** (and URL-prefix for subdomains if you use domain property, prefer **Domain** property for `halalresmenu.com`).
2. Submit sitemap: `https://halalresmenu.com/sitemap.xml`.
3. URL Inspection: spot-check `{slug}.halalresmenu.com` and `/city/london` after deploy — confirm canonical, `dateModified`, and noindex **absent** on production.
4. Confirm **pages.dev** preview URLs show **noindex** (Request: `curl -I https://<branch>.halalresmenu.pages.dev`).

---

## JSON-LD validation (post-fix sample)

Run locally:

```bash
npx tsx scripts/print-sample-jsonld.ts 7-spices anoki-derby sam-s-chicken-croydon
```

Example fields on **7-spices:** `image` (R2 WebP), `dateModified: 2026-10-05`, `openingHoursSpecification`, linked `Menu` with GBP offers when menu data present.
