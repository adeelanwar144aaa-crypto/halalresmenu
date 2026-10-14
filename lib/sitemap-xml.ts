import type { MetadataRoute } from "next";
import type { SitemapIndexEntry } from "@/lib/sitemap-data";
import { parseValidSitemapDate, sitemapDateToIso } from "@/lib/sitemap-dates";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function sitemapToXml(entries: MetadataRoute.Sitemap): string {
  const body = entries
    .map((entry) => {
      const lines = [`    <loc>${escapeXml(entry.url)}</loc>`];

      if (entry.lastModified != null) {
        const d = parseValidSitemapDate(entry.lastModified);
        const iso = sitemapDateToIso(d);
        if (iso) lines.push(`    <lastmod>${iso}</lastmod>`);
      }

      if (entry.changeFrequency) {
        lines.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
      }

      if (entry.priority != null) {
        lines.push(`    <priority>${entry.priority}</priority>`);
      }

      return `  <url>\n${lines.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export function sitemapIndexToXml(entries: SitemapIndexEntry[]): string {
  const body = entries
    .map((entry) => {
      const lines = [`    <loc>${escapeXml(entry.loc)}</loc>`];

      if (entry.lastModified != null) {
        const iso = sitemapDateToIso(parseValidSitemapDate(entry.lastModified));
        if (iso) lines.push(`    <lastmod>${iso}</lastmod>`);
      }

      return `  <sitemap>\n${lines.join("\n")}\n  </sitemap>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
}
