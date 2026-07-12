/**
 * Extract a usable London (or UK city) area label from restaurant address/postcode.
 * Used for meta descriptions — never invents areas; falls back to postcode district
 * then city ("London") when unsure.
 */

/** Outward postcode (district) → common local area name. Conservative mapping only. */
export const LONDON_POSTCODE_DISTRICT_AREAS: Readonly<Record<string, string>> = {
  // Central / West End
  W1: "West End",
  W1A: "West End",
  W1B: "Soho",
  W1C: "Mayfair",
  W1D: "Soho",
  W1F: "Soho",
  W1G: "Marylebone",
  W1H: "Marylebone",
  W1J: "Mayfair",
  W1K: "Mayfair",
  W1S: "Mayfair",
  W1T: "Fitzrovia",
  W1U: "Marylebone",
  W1W: "Fitzrovia",
  W2: "Paddington",
  W4: "Chiswick",
  W6: "Hammersmith",
  W8: "Kensington",
  W9: "Maida Vale",
  W10: "North Kensington",
  W11: "Notting Hill",
  W12: "Shepherd's Bush",
  W13: "West Ealing",
  W14: "West Kensington",
  WC1: "Bloomsbury",
  WC1A: "Holborn",
  WC1B: "Bloomsbury",
  WC1E: "Bloomsbury",
  WC1H: "Bloomsbury",
  WC1N: "Bloomsbury",
  WC1R: "Holborn",
  WC1V: "Holborn",
  WC1X: "Clerkenwell",
  WC2: "Covent Garden",
  WC2A: "Holborn",
  WC2B: "Covent Garden",
  WC2E: "Covent Garden",
  WC2H: "Covent Garden",
  WC2N: "Charing Cross",
  WC2R: "Strand",
  // City / East Central
  EC1: "Clerkenwell",
  EC1A: "Barbican",
  EC1M: "Clerkenwell",
  EC1N: "Farringdon",
  EC1R: "Clerkenwell",
  EC1V: "Islington",
  EC1Y: "Old Street",
  EC2: "City of London",
  EC2A: "Shoreditch",
  EC2M: "City of London",
  EC2N: "City of London",
  EC2R: "City of London",
  EC2V: "City of London",
  EC2Y: "Barbican",
  EC3: "City of London",
  EC3A: "City of London",
  EC3M: "City of London",
  EC3N: "Tower Hill",
  EC3R: "City of London",
  EC3V: "City of London",
  EC4: "City of London",
  EC4A: "Fleet Street",
  EC4M: "City of London",
  EC4N: "City of London",
  EC4R: "City of London",
  EC4V: "City of London",
  EC4Y: "Temple",
  // East
  E1: "Whitechapel",
  E1W: "Wapping",
  E2: "Bethnal Green",
  E3: "Bow",
  E5: "Clapton",
  E6: "East Ham",
  E7: "Forest Gate",
  E8: "Hackney",
  E9: "Homerton",
  E10: "Leyton",
  E11: "Leytonstone",
  E12: "Manor Park",
  E13: "Plaistow",
  E14: "Canary Wharf",
  E15: "Stratford",
  E16: "Canning Town",
  E17: "Walthamstow",
  E20: "Olympic Park",
  // North
  N1: "Islington",
  N4: "Finsbury Park",
  N5: "Highbury",
  N6: "Highgate",
  N7: "Holloway",
  N8: "Hornsey",
  N10: "Muswell Hill",
  N12: "North Finchley",
  N16: "Stoke Newington",
  N17: "Tottenham",
  N19: "Archway",
  N22: "Wood Green",
  // North West
  NW1: "Camden",
  NW2: "Cricklewood",
  NW3: "Hampstead",
  NW5: "Kentish Town",
  NW6: "Kilburn",
  NW8: "St John's Wood",
  NW10: "Willesden",
  NW11: "Golders Green",
  // South East
  SE1: "Southwark",
  SE5: "Camberwell",
  SE8: "Deptford",
  SE10: "Greenwich",
  SE11: "Kennington",
  SE13: "Lewisham",
  SE14: "New Cross",
  SE15: "Peckham",
  SE16: "Bermondsey",
  SE17: "Walworth",
  SE19: "Crystal Palace",
  SE22: "East Dulwich",
  SE23: "Forest Hill",
  // South West
  SW1: "Westminster",
  SW1A: "Westminster",
  SW1E: "Victoria",
  SW1H: "Westminster",
  SW1P: "Westminster",
  SW1V: "Pimlico",
  SW1W: "Belgravia",
  SW1X: "Belgravia",
  SW1Y: "St James's",
  SW2: "Brixton",
  SW3: "Chelsea",
  SW4: "Clapham",
  SW5: "Earl's Court",
  SW6: "Fulham",
  SW7: "South Kensington",
  SW8: "Nine Elms",
  SW9: "Stockwell",
  SW11: "Battersea",
  SW12: "Balham",
  SW15: "Putney",
  SW16: "Streatham",
  SW17: "Tooting",
  SW18: "Wandsworth",
  SW19: "Wimbledon",
  SW20: "Raynes Park",
};

/** Well-known street phrases → area (checked case-insensitively against address). */
const STREET_AREA_HINTS: ReadonlyArray<{ pattern: RegExp; area: string }> = [
  { pattern: /\bfleet\s*st(?:reet)?\b/i, area: "Fleet Street" },
  { pattern: /\bpeckham\s+high\s+st(?:reet)?\b/i, area: "Peckham" },
  { pattern: /\bbrixton\b/i, area: "Brixton" },
  { pattern: /\bsoho\b/i, area: "Soho" },
  { pattern: /\bshoreditch\b/i, area: "Shoreditch" },
  { pattern: /\bcamden\b/i, area: "Camden" },
  { pattern: /\bmayfair\b/i, area: "Mayfair" },
  { pattern: /\bnotting\s+hill\b/i, area: "Notting Hill" },
  { pattern: /\bcanary\s+wharf\b/i, area: "Canary Wharf" },
  { pattern: /\bwhitechapel\b/i, area: "Whitechapel" },
  { pattern: /\bhackney\b/i, area: "Hackney" },
  { pattern: /\bislington\b/i, area: "Islington" },
  { pattern: /\bgreenwich\b/i, area: "Greenwich" },
  { pattern: /\bwimbledon\b/i, area: "Wimbledon" },
  { pattern: /\btooting\b/i, area: "Tooting" },
  { pattern: /\bclapham\b/i, area: "Clapham" },
  { pattern: /\bbattersea\b/i, area: "Battersea" },
  { pattern: /\bfulham\b/i, area: "Fulham" },
  { pattern: /\bkensington\b/i, area: "Kensington" },
  { pattern: /\bchelsea\b/i, area: "Chelsea" },
  { pattern: /\bcleveland\s+st(?:reet)?\b/i, area: "Fitzrovia" },
  { pattern: /\bplashet\s+(?:grove|road)\b/i, area: "East Ham" },
  { pattern: /\bpier\s+rd\b/i, area: "Canning Town" },
];

export type AreaExtractionInput = {
  address?: string | null;
  postcode?: string | null;
  city?: string | null;
};

export type AreaExtractionResult = {
  /** Label safe to use in a meta description */
  area: string;
  /** How the label was chosen */
  source: "street_hint" | "postcode_district" | "postcode_fallback" | "city_fallback";
  /** Outward code if found, e.g. W1T */
  postcodeDistrict: string | null;
};

/** Extract UK outward postcode (district), e.g. W1T, EC4A, E16. */
export function extractPostcodeDistrict(
  address?: string | null,
  postcode?: string | null
): string | null {
  const haystack = [postcode, address].filter(Boolean).join(" ");
  if (!haystack) return null;
  const m = haystack.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*\d[A-Z]{2}\b/i);
  if (!m) return null;
  return m[1].toUpperCase();
}

function lookupDistrictArea(district: string): string | null {
  if (LONDON_POSTCODE_DISTRICT_AREAS[district]) {
    return LONDON_POSTCODE_DISTRICT_AREAS[district];
  }
  // Try parent sector for longer codes already exact; try shortening W1T → W1 only for W1*
  // Prefer exact keys only — do not guess W1T from W1 alone if exact missing (already checked).
  // For districts like SW1A already in map. If SW99 unknown, return null.
  return null;
}

/**
 * Deterministic area label for meta copy.
 * Priority: street hint → mapped postcode district → raw district → city → "London".
 */
export function extractRestaurantArea(
  input: AreaExtractionInput
): AreaExtractionResult {
  const address = String(input.address ?? "").trim();
  const city = String(input.city ?? "").trim() || "London";
  const district = extractPostcodeDistrict(address, input.postcode);

  for (const hint of STREET_AREA_HINTS) {
    if (address && hint.pattern.test(address)) {
      return {
        area: hint.area,
        source: "street_hint",
        postcodeDistrict: district,
      };
    }
  }

  if (district) {
    const mapped = lookupDistrictArea(district);
    if (mapped) {
      return {
        area: mapped,
        source: "postcode_district",
        postcodeDistrict: district,
      };
    }
    return {
      area: district,
      source: "postcode_fallback",
      postcodeDistrict: district,
    };
  }

  return {
    area: city,
    source: "city_fallback",
    postcodeDistrict: null,
  };
}
