export type AboutContentSection = {
  heading: string;
  body: string;
};

/** Stored in restaurants.about_content (jsonb). */
export type AboutContent = {
  intro: string;
  sections: AboutContentSection[];
};

export type GeneratedAboutPayload = AboutContent & {
  meta_title: string;
  meta_description: string;
};

export function parseAboutContent(raw: unknown): AboutContent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const intro = typeof o.intro === "string" ? o.intro.trim() : "";
  const sectionsRaw = Array.isArray(o.sections) ? o.sections : [];
  const sections: AboutContentSection[] = sectionsRaw
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const row = s as Record<string, unknown>;
      const heading = typeof row.heading === "string" ? row.heading.trim() : "";
      const body = typeof row.body === "string" ? row.body.trim() : "";
      if (!heading || !body) return null;
      return { heading, body };
    })
    .filter((s): s is AboutContentSection => s != null);

  if (!intro || sections.length === 0) return null;
  return { intro, sections };
}

export function aboutContentWordCount(content: AboutContent): number {
  const text = [
    content.intro,
    ...content.sections.map((s) => `${s.heading} ${s.body}`),
  ].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}
