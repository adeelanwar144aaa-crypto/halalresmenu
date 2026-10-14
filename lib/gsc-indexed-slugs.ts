import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import { parse } from "csv-parse/sync";
import { isSubdomainSafeSlug } from "@/lib/subdomain-slug";

const STATIC_APEX = new Set([
  "",
  "about",
  "contact",
  "privacy",
  "terms-conditions",
  "search",
  "city",
  "service-unavailable",
  "invalid-subdomain",
]);

const APEX_HOSTS = new Set(["halalresmenu.com", "www.halalresmenu.com"]);

export type GscParseReport = {
  files: string[];
  sheetWarnings: string[];
  totalIndexedUrls: number;
  restaurantSlugs: Set<string>;
  urlsBySlug: Map<string, string[]>;
};

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "www.") === "www.halalresmenu.com"
    ? "www.halalresmenu.com"
    : host.toLowerCase().replace(/^www\./, "");
}

/** Extract restaurant slug from indexed URL, or null if not a restaurant page. */
export function restaurantSlugFromIndexedUrl(rawUrl: string): string | null {
  const url = String(rawUrl ?? "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (host.endsWith(".halalresmenu.com")) {
    const sub = host.replace(/\.halalresmenu\.com$/i, "");
    if (!sub || sub === "www") return null;
    const slug = sub.toLowerCase();
    return isSubdomainSafeSlug(slug) ? slug : null;
  }

  if (APEX_HOSTS.has(host)) {
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    if (parts[0] === "city") return null;
    if (STATIC_APEX.has(parts[0])) return null;
    const slug = parts[0].toLowerCase();
    return isSubdomainSafeSlug(slug) ? slug : null;
  }

  return null;
}

function findUrlColumn(headers: unknown[]): number {
  const lower = headers.map((h) => String(h ?? "").toLowerCase());
  const idx = lower.findIndex((h) => h === "url" || h.includes("url"));
  return idx >= 0 ? idx : 0;
}

function rowsFromXlsx(filePath: string): { sheet: string; rows: string[][] }[] {
  const wb = XLSX.readFile(filePath);
  const out: { sheet: string; rows: string[][] }[] = [];
  for (const sheet of wb.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheet], {
      header: 1,
      defval: "",
    }) as string[][];
    out.push({ sheet, rows: matrix });
  }
  return out;
}

function rowsFromCsv(filePath: string): string[][] {
  const text = readFileSync(filePath, "utf8");
  return parse(text, { relax_column_count: true, skip_empty_lines: true });
}

export function loadGscIndexedSlugs(dataDir: string): GscParseReport {
  const files: string[] = [];
  const sheetWarnings: string[] = [];
  const urlsBySlug = new Map<string, string[]>();
  let totalIndexedUrls = 0;

  if (!existsSync(dataDir)) {
    return {
      files,
      sheetWarnings,
      totalIndexedUrls: 0,
      restaurantSlugs: new Set(),
      urlsBySlug,
    };
  }

  for (const name of readdirSync(dataDir)) {
    if (!/\.(xlsx|csv)$/i.test(name)) continue;
    const filePath = join(dataDir, name);
    files.push(name);

    if (name.toLowerCase().endsWith(".csv")) {
      const matrix = rowsFromCsv(filePath);
      if (matrix.length <= 1000) {
        sheetWarnings.push(`${name}: ${matrix.length} rows (check GSC 1,000-row export cap)`);
      }
      const urlCol = findUrlColumn(matrix[0] ?? []);
      for (let i = 1; i < matrix.length; i++) {
        const url = String(matrix[i]?.[urlCol] ?? "").trim();
        if (!url) continue;
        totalIndexedUrls++;
        const slug = restaurantSlugFromIndexedUrl(url);
        if (!slug) continue;
        const list = urlsBySlug.get(slug) ?? [];
        list.push(url);
        urlsBySlug.set(slug, list);
      }
      continue;
    }

    for (const { sheet, rows } of rowsFromXlsx(filePath)) {
      if (rows.length === 1000 || rows.length === 1001) {
        sheetWarnings.push(
          `${name} / ${sheet}: ${rows.length} rows — may hit GSC 1,000 URL export limit`
        );
      }
      if (rows.length < 2) continue;
      const urlCol = findUrlColumn(rows[0]);
      for (let i = 1; i < rows.length; i++) {
        const url = String(rows[i]?.[urlCol] ?? "").trim();
        if (!url || url.toLowerCase() === "url") continue;
        totalIndexedUrls++;
        const slug = restaurantSlugFromIndexedUrl(url);
        if (!slug) continue;
        const list = urlsBySlug.get(slug) ?? [];
        list.push(url);
        urlsBySlug.set(slug, list);
      }
    }
  }

  return {
    files,
    sheetWarnings,
    totalIndexedUrls,
    restaurantSlugs: new Set(urlsBySlug.keys()),
    urlsBySlug,
  };
}
