/** Map common UK country strings to ISO 3166-1 alpha-2 for PostalAddress.addressCountry. */
export function normalizeAddressCountry(
  raw: string | null | undefined
): string | undefined {
  if (!raw?.trim()) return "GB";
  const s = raw.trim();
  const lower = s.toLowerCase();
  if (
    lower === "uk" ||
    lower === "gb" ||
    lower === "gbr" ||
    lower === "united kingdom" ||
    lower === "great britain" ||
    lower === "england" ||
    lower === "scotland" ||
    lower === "wales" ||
    lower === "northern ireland"
  ) {
    return "GB";
  }
  if (/^[a-z]{2}$/i.test(s)) return s.toUpperCase();
  return s;
}

/** Normalize UK listing phones to E.164-style +44 for schema.org telephone. */
export function normalizeSchemaTelephone(
  phone: string | null | undefined
): string | undefined {
  if (!phone?.trim()) return undefined;
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    return trimmed.replace(/\s+/g, " ");
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return undefined;

  if (digits.startsWith("44") && digits.length >= 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2)}`.trim();
  }
  if (digits.startsWith("0")) {
    return `+44 ${digits.slice(1)}`.trim();
  }
  return `+44 ${digits}`.trim();
}
