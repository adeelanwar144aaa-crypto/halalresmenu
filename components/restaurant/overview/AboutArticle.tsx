import type { Restaurant } from "@/types/restaurant";

export function AboutArticle({ restaurant }: { restaurant: Restaurant }) {
  // Only show the short factual description, not AI-generated content
  if (!restaurant.description) return null;

  return (
    <section id="about" className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-base text-zinc-600">{restaurant.description}</p>
    </section>
  );
}
