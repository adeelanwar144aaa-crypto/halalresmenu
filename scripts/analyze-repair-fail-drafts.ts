/**
 * Re-check REVIEW/FAIL drafts (no API): repair meta/name/city, apply new quality rules, upgrade to PASS.
 */
import {
  listAboutDraftFiles,
  payloadToDraftFields,
  writeAboutDraft,
  type AboutDraftFile,
} from "@/lib/about-draft";
import type { MenuData } from "@/types/restaurant";
import type { GeneratedAboutPayload } from "@/lib/about-content-types";
import {
  preparePayloadForValidation,
  validateGeneratedAbout,
} from "@/lib/about-content-quality";

function draftToPayload(d: AboutDraftFile): GeneratedAboutPayload | null {
  if (!d.intro?.trim() || !d.meta_title?.trim() || !d.meta_description?.trim()) {
    return null;
  }
  if (d.sections.length < 3) return null;
  return {
    intro: d.intro,
    meta_title: d.meta_title,
    meta_description: d.meta_description,
    sections: d.sections,
  };
}

function main() {
  const drafts = listAboutDraftFiles();
  const candidates = drafts.filter(
    (d) =>
      (d.quality?.status === "FAIL" ||
        d.quality?.status === "REVIEW" ||
        d.quality?.reasons?.some((r) => r.includes("whether you"))) &&
      d.intro?.trim() &&
      d.sections.length >= 3
  );

  let upgraded = 0;
  for (const d of candidates) {
    const payload = draftToPayload(d);
    if (!payload) continue;
    const menu = d.source?.menu_json as MenuData | null;
    const fixed = preparePayloadForValidation(payload, d.name, d.city);
    const check = validateGeneratedAbout({
      payload: fixed,
      menuData: menu,
      aboutRaw: d.source?.about_raw ?? null,
      restaurantName: d.name,
      city: d.city,
    });
    if (!check.ok) continue;
    const fields = payloadToDraftFields(fixed);
    writeAboutDraft({
      ...d,
      ...fields,
      quality: { pass: true, status: "PASS", reasons: [] },
      error: undefined,
    });
    upgraded++;
  }

  console.log(
    `Re-checked ${candidates.length} REVIEW/FAIL drafts with content; upgraded to PASS: ${upgraded}`
  );
}

main();
