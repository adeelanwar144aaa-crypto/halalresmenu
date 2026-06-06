import { edgeFetch } from "@/lib/edge-fetch";
import type { Restaurant } from "@/types/restaurant";

function fallbackAbout(r: Restaurant): string[] {
  const loc = [r.address, r.city, r.country].filter(Boolean).join(", ");
  const cert = r.halal_certifier
    ? `The venue lists ${r.halal_certifier} as its halal certification partner.`
    : `Halal verification details are maintained for diners who prefer certified kitchens.`;
  const cuisine = r.cuisine_type
    ? `The kitchen highlights ${r.cuisine_type} cooking, with a menu suited to relaxed dining and shared plates.`
    : `Expect a warm, neighbourhood atmosphere with dishes curated for families and friends.`;
  return [
    `${r.name} is featured on HalalResMenu as a halal-conscious dining option${loc ? ` in ${loc}` : ""}. ${cuisine}`,
    cert,
    `We recommend calling ahead for reservations and confirming today’s service style. Always verify halal practices directly with the restaurant before visiting.`,
  ];
}

export async function generateRestaurantAboutParagraphs(
  restaurant: Restaurant
): Promise<string[]> {
  const key = process.env.CLAUDE_API_KEY?.trim();
  if (!key || key.length < 10) {
    return fallbackAbout(restaurant);
  }

  const payload = {
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1200,
    messages: [
      {
        role: "user" as const,
        content: `Write exactly 3 short paragraphs (plain prose, no bullet points) for a restaurant directory article about "${restaurant.name}".
Include naturally: location (${restaurant.city ?? ""}, ${restaurant.country ?? ""}), street context (${restaurant.address ?? ""}), cuisine (${restaurant.cuisine_type ?? "unspecified"}), halal status (${restaurant.halal_status ?? ""}) and certifier (${restaurant.halal_certifier ?? "unspecified"}), ambiance, and inferred specialties from the cuisine style.
Tone: professional food/travel magazine. Do not invent awards or exact dish names unless generic (e.g. "grilled meats"). End the third paragraph reminding readers to confirm halal status by phone before visiting.`,
      },
    ],
  };

  try {
    const res = await edgeFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return fallbackAbout(restaurant);
    const json = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = json.content?.find((b) => b.type === "text")?.text?.trim();
    if (!text) return fallbackAbout(restaurant);
    const parts = text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) return parts.slice(0, 5);
    return fallbackAbout(restaurant);
  } catch {
    return fallbackAbout(restaurant);
  }
}
