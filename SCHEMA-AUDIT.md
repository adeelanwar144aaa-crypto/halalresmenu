# Structured data (JSON-LD) audit — HalalResMenu

**Audit date:** 2026-10-05  
**Sources:** Production HTML (`scripts/fetch-schema-inventory.mjs`), codebase review, `npm run validate:schema` against Supabase (3,795 listings).

---

## 1. Inventory (rendered HTML)

Production fetch note: apex pages (`halalresmenu.com/city/*`, `/about`, etc.) returned **503** intermittently during the audit window; restaurant **subdomains returned 200**. Inventory below combines successful production samples with **code inspection** for page types that had no JSON-LD or failed fetch.

| Page type | Example URL | JSON-LD blocks | `@types` present | `@id` values | Microdata/RDFa |
|-----------|-------------|----------------|------------------|--------------|----------------|
| Home | `https://halalresmenu.com/` | 1 | `Organization`, `WebSite`, `SearchAction`, `EntryPoint` | `https://halalresmenu.com/#organization`, `https://halalresmenu.com/#website` | None |
| City hub | `https://halalresmenu.com/city/london` | 0 | — | — | None |
| City + cuisine hub | `https://halalresmenu.com/city/london/pakistani` | 0 (404 on prod; route not deployed) | — | — | None |
| City index | `https://halalresmenu.com/city` | 0 | — | — | None |
| Restaurant overview | `https://7-spices.halalresmenu.com/` | 1 (`@graph`) | `Restaurant`, `FoodEstablishment`, `LocalBusiness`, `PostalAddress`, `GeoCoordinates`, `OpeningHoursSpecification`, `ItemList`, `MenuItem`, `Offer`, `AggregateRating`, `Review`, `Rating`, `Person`, … | `https://7-spices.halalresmenu.com` | None |
| Restaurant `/menu` | `https://7-spices.halalresmenu.com/menu` | 1 | `Restaurant`, `Menu`, `MenuSection`, `MenuItem`, `Offer`, … | **Pre-fix:** `@id`/`url` wrongly set to `/menu` URL; **Post-fix:** stable `https://7-spices.halalresmenu.com` + `https://7-spices.halalresmenu.com#menu` | None |
| Restaurant `/halal-info` | `https://7-spices.halalresmenu.com/halal-info` | 1 | Same core types as overview (no full `Menu`) | **Pre-fix:** `/halal-info` URL as `@id`; **Post-fix:** overview `@id` | None |
| Restaurant `/photos` | `https://7-spices.halalresmenu.com/photos` | N/A | **No route** (404) | — | None |
| About / Contact / Privacy | `/about`, `/contact`, `/privacy` | 0 | — | — | None |
| Search | `/search` | 0 | — | — | None |
| 404 | non-existent path | 0 | — | — | None |

**Implementation files**

- Home: `components/seo/HomeSchema.tsx`
- Restaurant tabs: `components/seo/SchemaMarkup.tsx`, `components/seo/OverviewSchema.tsx`
- Used on: `app/page.tsx`, `app/[restaurant]/page.tsx`, `app/[restaurant]/menu/page.tsx`, `app/[restaurant]/halal-info/page.tsx`

---

## 2. Validation findings

### Pre-fix (production HTML + prior code)

| Issue | Severity | Detail |
|-------|----------|--------|
| Restaurant `@id` / `url` on `/menu` and `/halal-info` | **Error** | Pointed at tab URL instead of canonical overview URL |
| `FAQPage` on overview | **Error** | No matching visible FAQ UI (halal Q&A shown as article copy, not FAQ markup) |
| `BreadcrumbList` | **Error** | No visible breadcrumb navigation on site |
| `addressCountry: "UK"` | **Warning** | Should be ISO `GB` |
| `telephone` local format (e.g. `0141 …`) | **Warning** | Google recommends international `+44` |
| `@id` consistency | **Warning** | Organization/WebSite stable on home; restaurant `@id` unstable across tabs pre-fix |

**Sample checks (7 Spices overview, production)**

- JSON: valid; `@context`: `https://schema.org`
- R2 image HEAD: **200** (`…/7-spices/photos/photo-1.webp`)
- Reviews/ratings in JSON-LD match visible `ReviewsArticle` / hero when Google reviews exist
- Menu `ItemList` aligns with `getMenuSchemaSample()` / visible menu highlights (same source as `MenuHighlights`)

### Post-fix (code + `npm run validate:schema`)

| Metric | Before (estimated from rules above) | After |
|--------|-------------------------------------|-------|
| Listings with **errors** | ~3,795 (FAQ + breadcrumbs + subpage `@id` on menu/halal graphs) | **0** |
| Listings with **warnings** | ~3,795+ (`UK` phone/country) | **228** |
| Missing telephone (data) | 123 | 123 |
| Missing geo (data) | 0 | 0 |
| Missing hours (data) | 121 | 121 |
| Missing image (data) | 0 | 0 |

**Top remaining warnings (data, not code)**

| Code | Count | Example slugs |
|------|-------|----------------|
| `missing_telephone` | 123 | `taste-of-chennai`, `the-fat-swan`, `popeyes-grill` |
| `missing_hours` | 121 | `darjeeling-express`, `vojon`, `peter-pan` |
| `telephone_format` | 6 | `mr-grill`, `simply-grilled`, `reyhoon` |
| `address_country` | 2 | `bismillah-grill` (non-UK stored country) |

---

## 3. Rich result eligibility (by page type, post-fix)

| Page type | Eligible / useful rich results | Notes |
|-----------|-------------------------------|--------|
| Home | **WebSite** sitelinks search box | `SearchAction` → `/search?q={search_term_string}` |
| Home | **Organization** | Logo + publisher linkage |
| City / static / 404 | None from JSON-LD | No markup emitted |
| Restaurant overview | **LocalBusiness / Restaurant** | Name, address, geo, hours, phone, image when present |
| Restaurant overview | **Review snippets** | Only when Google reviews are rendered on page |
| Restaurant overview | **Menu highlights** | `ItemList` of `MenuItem` (not full Menu rich result) |
| Restaurant `/menu` | **Menu** (experimental / limited) | Full `Menu` + `MenuSection` + priced `MenuItem` / `Offer` (`GBP`) |
| Restaurant `/halal-info` | **LocalBusiness** | Same entity `@id` as overview; no FAQ block |

Google does not guarantee rich results; eligibility assumes required fields are present in DB (phone, hours, image, etc.).

---

## 4. Code changes (this audit)

- **`components/seo/SchemaMarkup.tsx`:** `addressCountry` → `GB`; `telephone` → `+44`; stable restaurant `@id`; removed `BreadcrumbList` and overview `FAQPage`; menu `@id` `{canonical}#menu`.
- **Restaurant pages:** pass canonical overview URL to `SchemaMarkup` on all tabs.
- **`components/seo/OverviewSchema.tsx`:** drop FAQ JSON-LD.
- **`lib/schema-normalize.ts`**, **`lib/schema-audit.ts`**, **`scripts/validate-schema.ts`**, **`scripts/fetch-schema-inventory.mjs`**, npm script **`validate:schema`**.

Re-run site-wide check:

```bash
npm run validate:schema
npm run validate:schema -- --json
```

---

## 5. Manual test URLs (Rich Results Test + validator.schema.org)

| Role | URL |
|------|-----|
| Home | https://halalresmenu.com/ |
| City | https://halalresmenu.com/city/london |
| Cuisine hub | *Not on production yet* — use city until `/city/[citySlug]/[cuisineSlug]` ships |
| Restaurant (overview) | https://7-spices.halalresmenu.com/ |
| Restaurant menu (optional) | https://7-spices.halalresmenu.com/menu |

After deploy, re-fetch inventory:

```bash
node scripts/fetch-schema-inventory.mjs > scripts/logs/schema-inventory-production.json
```
