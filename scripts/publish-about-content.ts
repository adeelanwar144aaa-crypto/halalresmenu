/**
 * Publish approved drafts from scripts/drafts/*.json to Supabase.
 *
 *   npm run publish:about -- --all
 *   npm run publish:about -- --only slug1,slug2
 *   npm run publish:about -- --all --skip slug1,slug2
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import {
  listAboutDraftFiles,
  readAboutDraft,
  type AboutDraftFile,
} from "@/lib/about-draft";

const args = process.argv.slice(2);

function parseList(flag: string): string[] | null {
  const eq = args.find((a) => a.startsWith(`${flag}=`));
  if (eq) {
    return eq
      .slice(flag.length + 1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const i = args.indexOf(flag);
  if (i >= 0 && args[i + 1]) {
    return args[i + 1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return null;
}

const ALL = args.includes("--all");
const REVIEW = args.includes("--review");
const ONLY = parseList("--only");
const SKIP = new Set(parseList("--skip") ?? []);

function draftPublishable(d: AboutDraftFile, allowReview = false): string | null {
  if (d.error) return d.error;
  if (d.quality?.status === "REVIEW" && allowReview) {
    /* manual review publish */
  } else if (!d.quality?.pass) {
    return `quality ${d.quality?.status ?? "FAIL"}: ${d.quality?.reasons?.join("; ") ?? "unknown"}`;
  }
  if (!d.intro?.trim() || !d.sections?.length) return "missing intro/sections";
  if (!d.meta_title?.trim() || !d.meta_description?.trim()) {
    return "missing meta_title or meta_description";
  }
  return null;
}

async function main() {
  if (!ALL && !ONLY && !REVIEW) {
    console.error("Use --all, --review, or --only slug1,slug2");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  let drafts = listAboutDraftFiles();
  if (REVIEW) {
    drafts = drafts.filter((d) => d.quality?.status === "REVIEW");
  } else if (ALL) {
    drafts = drafts.filter(
      (d) => d.quality?.status === "PASS" || (d.quality?.pass && d.quality?.status !== "REVIEW")
    );
  }
  if (ONLY) {
    const set = new Set(ONLY);
    drafts = ONLY.map((slug) => readAboutDraft(slug)).filter(
      (d): d is AboutDraftFile => d != null && set.has(d.slug)
    );
    for (const slug of ONLY) {
      if (!readAboutDraft(slug)) console.warn("No draft for", slug);
    }
  }
  drafts = drafts.filter((d) => !SKIP.has(d.slug));

  const publishedSlugs = new Set<string>();
  if (ALL && !REVIEW) {
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("restaurants")
        .select("slug, content_generated_at, about_content")
        .not("content_generated_at", "is", null)
        .range(from, from + 999);
      if (error) throw error;
      const batch = data ?? [];
      for (const row of batch) {
        const ac = row.about_content as { intro?: string } | null;
        if (row.slug && ac?.intro?.trim()) publishedSlugs.add(row.slug);
      }
      if (batch.length < 1000) break;
      from += 1000;
    }
  }

  let published = 0;
  let skipped = 0;

  for (const d of drafts) {
    if (ALL && !REVIEW && publishedSlugs.has(d.slug)) {
      skipped++;
      continue;
    }
    const block = draftPublishable(d, REVIEW || d.quality?.status === "REVIEW");
    if (block && !ONLY?.includes(d.slug)) {
      console.log("skip", d.slug, "—", block);
      skipped++;
      continue;
    }
    if (block && ONLY?.includes(d.slug)) {
      console.warn("publish", d.slug, "despite:", block);
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("restaurants")
      .update({
        about_content: { intro: d.intro!, sections: d.sections },
        seo_title: d.meta_title,
        seo_meta_description: d.meta_description,
        content_generated_at: now,
        updated_at: now,
      })
      .eq("slug", d.slug);

    if (error) {
      console.error("fail", d.slug, error.message);
      skipped++;
    } else {
      console.log("published", d.slug);
      published++;
    }
  }

  console.log({ published, skipped, total: drafts.length });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
