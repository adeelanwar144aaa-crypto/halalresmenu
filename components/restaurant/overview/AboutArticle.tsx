import {
  aboutLocationTag,
  aboutSectionHeading,
  buildAboutParagraphs,
} from "@/lib/about-content";
import { aboutSectionParagraphs, parseSeoContent } from "@/lib/seo-content";
import type { Restaurant } from "@/types/restaurant";

export function AboutArticle({ restaurant }: { restaurant: Restaurant }) {
  const location = aboutLocationTag(restaurant);
  const seo = parseSeoContent(restaurant.seo_content);

  const heading = seo?.h1?.trim() || aboutSectionHeading(restaurant);
  const paragraphs = seo
    ? aboutSectionParagraphs(seo.about_section)
    : buildAboutParagraphs(restaurant);
  const faq = seo?.faq ?? [];

  return (
    <section
      id="about"
      className="scroll-mt-32 border-b border-zinc-100/80 bg-white py-10 sm:scroll-mt-36 sm:py-12"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl px-6 py-8 sm:px-8 sm:py-10"
          style={{ backgroundColor: "#f9f9f9" }}
        >
          {location ? (
            <p className="text-sm font-semibold text-zinc-600">
              <span aria-hidden>📍 </span>
              {location}
            </p>
          ) : null}

          <div className={`flex items-start gap-3 ${location ? "mt-4" : ""}`}>
            <span
              className="mt-2 hidden h-9 w-1 shrink-0 rounded-full bg-halal-600 sm:block"
              aria-hidden
            />
            <h2
              className="text-3xl font-bold leading-tight tracking-tight"
              style={{ color: "#1a3a2a" }}
            >
              {heading}
            </h2>
          </div>

          <div className="mt-6 max-w-3xl space-y-5 text-base leading-[1.8] text-zinc-700">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {faq.length > 0 ? (
            <div className="mt-10 border-t border-zinc-200/80 pt-8">
              <h3 className="text-xl font-bold tracking-tight text-zinc-900">
                Frequently asked questions
              </h3>
              <dl className="mt-6 space-y-6">
                {faq.map((item, i) => (
                  <div key={i}>
                    <dt className="text-base font-semibold text-zinc-900">
                      {item.question}
                    </dt>
                    <dd className="mt-2 text-base leading-relaxed text-zinc-600">
                      {item.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
