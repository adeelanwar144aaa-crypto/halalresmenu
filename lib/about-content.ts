import { formatTodayOpeningLine } from "@/lib/opening-hours-display";
import type { Restaurant } from "@/types/restaurant";

export function aboutLocationTag(restaurant: Restaurant): string | null {
  const parts = [restaurant.city, restaurant.country].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(", ");
}

/** SEO H2: "[Name] — [Cuisine] in [City]" */
export function aboutSectionHeading(restaurant: Restaurant): string {
  const name = restaurant.name.trim();
  const cuisine = restaurant.cuisine_type?.trim();
  const city = restaurant.city?.trim();

  if (cuisine && city) return `${name} — ${cuisine} in ${city}`;
  if (city) return `${name} in ${city}`;
  if (cuisine) return `${name} — ${cuisine}`;
  return name;
}

function hasTakeaway(r: Restaurant): boolean {
  return Boolean(r.has_takeaway ?? r.takeaway_available ?? r.takeaway);
}

function hasDineIn(r: Restaurant): boolean | null {
  const v = r.dine_in_available ?? r.dine_in;
  return typeof v === "boolean" ? v : null;
}

function hasDelivery(r: Restaurant): boolean | null {
  const v = r.has_delivery ?? r.delivery_available ?? r.delivery;
  return typeof v === "boolean" ? v : null;
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildAtmospherePhrase(r: Restaurant): string {
  const traits: string[] = [];
  if (r.family_friendly) traits.push("family-friendly");
  if (r.muslim_owned) traits.push("welcoming to the local Muslim community");
  if (r.price_range) traits.push(`priced around ${r.price_range}`);
  if (traits.length === 0) {
    return "The setting suits relaxed meals with friends, families, and casual visits.";
  }
  return `It is known as a ${joinNatural(traits)} spot where guests can enjoy unhurried meals.`;
}

function buildIntroParagraph(r: Restaurant): string {
  const city = r.city?.trim();
  const country = r.country?.trim();
  const cuisine = r.cuisine_type?.trim();
  const loc = [r.address, city, country].filter(Boolean).join(", ");
  const area = city && country ? `${city}, ${country}` : city || country || "the area";

  const cuisineLead = cuisine
    ? `a ${cuisine.toLowerCase()} restaurant`
    : "a halal-friendly restaurant";

  let p = `${r.name} is ${cuisineLead} in ${area}`;

  if (r.address && city) {
    p += `, located at ${r.address}`;
  } else if (loc) {
    p += ` (${loc})`;
  }

  p += ". ";

  if (r.description?.trim()) {
    const snippet = r.description.trim().replace(/\s+/g, " ");
    const first = snippet.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? snippet;
    const extra =
      first.length > 40 && first.length < 320
        ? first.endsWith(".")
          ? first + " "
          : first + ". "
        : "";
    if (extra) p += extra;
  }

  p += buildAtmospherePhrase(r);

  if (cuisine) {
    p += ` Expect flavours and dishes shaped by ${cuisine.toLowerCase()} cooking, with options that suit a range of tastes.`;
  }

  return p;
}

function buildHalalParagraph(r: Restaurant): string {
  const status = String(r.halal_status ?? "").toLowerCase();
  const parts: string[] = [];

  if (status === "certified" && r.halal_certifier) {
    parts.push(
      `${r.name} is listed as halal certified, with ${r.halal_certifier} noted as the certifying body.`
    );
  } else if (status === "certified") {
    parts.push(`${r.name} is listed as halal certified on this directory.`);
  } else if (status === "claimed_halal") {
    parts.push(
      `${r.name} describes itself as halal; we recommend confirming certification and sourcing when you visit.`
    );
  } else {
    parts.push(
      `Halal-conscious diners should confirm slaughter, sourcing, and certification directly with ${r.name} before ordering.`
    );
  }

  if (r.pork_free === true) {
    parts.push("The venue is marked as pork-free.");
  } else if (r.pork_free === false) {
    parts.push("Pork may be served — check with staff if this affects your visit.");
  }

  if (r.alcohol_on_premises === false) {
    parts.push("Alcohol is not served on the premises, which suits many families and faith-conscious guests.");
  } else if (r.alcohol_on_premises === true) {
    parts.push("Alcohol is served on site; guests who avoid alcohol may wish to ask about seating and menu choices.");
  }

  if (r.muslim_owned) {
    parts.push("The business is indicated as Muslim-owned.");
  }

  if (parts.length === 1) {
    return (
      parts[0] +
      " Call ahead if you need written certification details or allergen information."
    );
  }

  return parts.join(" ");
}

function buildDiningParagraph(r: Restaurant): string {
  const services: string[] = [];
  const dineIn = hasDineIn(r);
  const takeaway = hasTakeaway(r);
  const delivery = hasDelivery(r);

  if (dineIn === true) services.push("dine-in");
  if (takeaway) services.push("takeaway");
  if (delivery === true) services.push("delivery");

  const todayHours = formatTodayOpeningLine(r.opening_hours);
  let p = "";

  if (services.length > 0) {
    p = `You can use ${joinNatural(services)} here`;
    if (r.reservation_available) {
      p += ", and reservations are indicated as available";
    }
    p += ". ";
  } else {
    p = "Contact the restaurant to confirm whether dine-in, takeaway, or delivery is available. ";
  }

  if (todayHours && todayHours !== "Hours not listed") {
    p += `Today's hours: ${todayHours}. `;
  } else {
    p += "Opening hours are not fully listed online — call before you travel. ";
  }

  if (r.phone) {
    p += `Reach the team on ${r.phone} to check the latest times or place an order.`;
  } else {
    p += "Check their website or visit in person for the most accurate timings.";
  }

  return p.trim();
}

/** Three natural about paragraphs built from database fields. */
export function buildAboutParagraphs(restaurant: Restaurant): string[] {
  return [
    buildIntroParagraph(restaurant),
    buildHalalParagraph(restaurant),
    buildDiningParagraph(restaurant),
  ];
}
