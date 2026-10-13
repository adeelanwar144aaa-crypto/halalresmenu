import type { AboutContent } from "@/lib/about-content-types";

export function RestaurantAboutContent({
  content,
}: {
  content: AboutContent;
}) {
  return (
    <section
      id="about"
      className="border-b border-zinc-100/80 bg-white py-12 sm:py-16"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="prose prose-zinc prose-lg max-w-none">
          <p className="leading-relaxed text-zinc-700">{content.intro}</p>
          {content.sections.map((section) => (
            <div key={section.heading} className="mt-10">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                {section.heading}
              </h2>
              {section.body.split(/\n\n+/).map((para, i) => (
                <p key={i} className="mt-4 leading-relaxed text-zinc-700">
                  {para.trim()}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
