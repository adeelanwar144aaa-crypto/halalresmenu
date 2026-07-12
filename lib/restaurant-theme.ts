/**
 * Deterministic per-restaurant color themes from a curated, WCAG AA-safe palette.
 * Hash(cuisine + name) → stable index; never fully random hex.
 */

export type RestaurantThemeColors = {
  primary_color: string;
  background_color: string;
  accent_color: string;
};

/** Full CSS-ready theme including derived Tailwind scale (space-separated RGB). */
export type RestaurantThemeCss = RestaurantThemeColors & {
  /** RGB channels for Tailwind opacity: "26 122 74" */
  scaleRgb: Record<
    50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950,
    string
  >;
  backgroundRgb: string;
  accentRgb: string;
};

type PaletteEntry = {
  /** Mid brand / buttons (halal-600) — white text must pass AA */
  primary: string;
  /** Soft page / hero wash */
  background: string;
  /** Headlines / strong text on background — must pass AA on background */
  accent: string;
};

/**
 * 18 tasteful pairs tuned for restaurant UIs.
 * Contrast checked: white-on-primary ≥ 4.5:1; accent-on-background ≥ 4.5:1.
 */
export const RESTAURANT_THEME_PALETTE: readonly PaletteEntry[] = [
  { primary: "#1a7a4a", background: "#f0faf4", accent: "#0f3d29" }, // forest (brand)
  { primary: "#0f766e", background: "#f0fdfa", accent: "#134e4a" }, // teal
  { primary: "#1d4ed8", background: "#eff6ff", accent: "#1e3a8a" }, // blue
  { primary: "#7c3aed", background: "#f5f3ff", accent: "#4c1d95" }, // violet
  { primary: "#be185d", background: "#fdf2f8", accent: "#831843" }, // rose
  { primary: "#b45309", background: "#fffbeb", accent: "#78350f" }, // amber
  { primary: "#b91c1c", background: "#fef2f2", accent: "#7f1d1d" }, // red
  { primary: "#0e7490", background: "#ecfeff", accent: "#164e63" }, // cyan
  { primary: "#4d7c0f", background: "#f7fee7", accent: "#365314" }, // lime
  { primary: "#c2410c", background: "#fff7ed", accent: "#7c2d12" }, // orange
  { primary: "#4338ca", background: "#eef2ff", accent: "#312e81" }, // indigo
  { primary: "#334155", background: "#f8fafc", accent: "#0f172a" }, // slate
  { primary: "#a16207", background: "#fefce8", accent: "#713f12" }, // gold
  { primary: "#9f1239", background: "#fff1f2", accent: "#881337" }, // crimson
  { primary: "#166534", background: "#f0fdf4", accent: "#14532d" }, // emerald
  { primary: "#1e40af", background: "#eff6ff", accent: "#1e3a8a" }, // royal
  { primary: "#6d28d9", background: "#faf5ff", accent: "#5b21b6" }, // purple
  { primary: "#9a3412", background: "#fff7ed", accent: "#7c2d12" }, // terracotta
] as const;

const BRAND_DEFAULT: PaletteEntry = RESTAURANT_THEME_PALETTE[0];

function normalizeHex(hex: string): string | null {
  const raw = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const full = raw
      .split("")
      .map((c) => c + c)
      .join("");
    return `#${full.toLowerCase()}`;
  }
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return `#${raw.toLowerCase()}`;
}

export function hexToRgbChannels(hex: string): string {
  const n = normalizeHex(hex);
  if (!n) return "0 0 0";
  const v = parseInt(n.slice(1), 16);
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  return `${r} ${g} ${b}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = normalizeHex(hex) ?? "#000000";
  const v = parseInt(n.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t
  );
}

/** Relative luminance (sRGB). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA normal text = 4.5:1 */
export function passesWcagAa(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= 4.5;
}

/**
 * FNV-1a 32-bit hash — deterministic across Node and edge runtimes.
 */
export function hashThemeSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function themeSeedFromRestaurant(input: {
  name?: string | null;
  cuisine_type?: string | null;
  slug?: string | null;
}): string {
  const cuisine = String(input.cuisine_type ?? "")
    .trim()
    .toLowerCase();
  const name = String(input.name ?? "")
    .trim()
    .toLowerCase();
  const slug = String(input.slug ?? "")
    .trim()
    .toLowerCase();
  return `${cuisine}|${name || slug}`;
}

export function pickPaletteEntry(seed: string): PaletteEntry {
  const idx = hashThemeSeed(seed) % RESTAURANT_THEME_PALETTE.length;
  return RESTAURANT_THEME_PALETTE[idx] ?? BRAND_DEFAULT;
}

/** Assign theme colors for a restaurant (used by backfill + runtime fallback). */
export function generateRestaurantTheme(input: {
  name?: string | null;
  cuisine_type?: string | null;
  slug?: string | null;
}): RestaurantThemeColors {
  const entry = pickPaletteEntry(themeSeedFromRestaurant(input));
  return {
    primary_color: entry.primary,
    background_color: entry.background,
    accent_color: entry.accent,
  };
}

function buildScaleFromPrimary(primary: string, accent: string) {
  return {
    50: hexToRgbChannels(mix(primary, "#ffffff", 0.92)),
    100: hexToRgbChannels(mix(primary, "#ffffff", 0.84)),
    200: hexToRgbChannels(mix(primary, "#ffffff", 0.7)),
    300: hexToRgbChannels(mix(primary, "#ffffff", 0.5)),
    400: hexToRgbChannels(mix(primary, "#ffffff", 0.28)),
    500: hexToRgbChannels(mix(primary, "#ffffff", 0.1)),
    600: hexToRgbChannels(primary),
    700: hexToRgbChannels(mix(primary, "#000000", 0.18)),
    800: hexToRgbChannels(mix(primary, "#000000", 0.32)),
    900: hexToRgbChannels(mix(primary, accent, 0.55)),
    950: hexToRgbChannels(mix(accent, "#000000", 0.35)),
  } as const;
}

export function resolveThemeCss(
  colors: RestaurantThemeColors
): RestaurantThemeCss {
  const primary =
    normalizeHex(colors.primary_color) ?? BRAND_DEFAULT.primary;
  const background =
    normalizeHex(colors.background_color) ?? BRAND_DEFAULT.background;
  const accent =
    normalizeHex(colors.accent_color) ?? BRAND_DEFAULT.accent;

  return {
    primary_color: primary,
    background_color: background,
    accent_color: accent,
    scaleRgb: buildScaleFromPrimary(primary, accent),
    backgroundRgb: hexToRgbChannels(background),
    accentRgb: hexToRgbChannels(accent),
  };
}

export function themeFromRestaurant(restaurant: {
  name?: string | null;
  cuisine_type?: string | null;
  slug?: string | null;
  primary_color?: string | null;
  background_color?: string | null;
  accent_color?: string | null;
}): RestaurantThemeCss {
  const hasStored =
    normalizeHex(restaurant.primary_color ?? "") &&
    normalizeHex(restaurant.background_color ?? "") &&
    normalizeHex(restaurant.accent_color ?? "");

  const colors: RestaurantThemeColors = hasStored
    ? {
        primary_color: restaurant.primary_color as string,
        background_color: restaurant.background_color as string,
        accent_color: restaurant.accent_color as string,
      }
    : generateRestaurantTheme(restaurant);

  return resolveThemeCss(colors);
}

/** Brand defaults for apex / main domain (no restaurant slug). */
export function brandThemeCss(): RestaurantThemeCss {
  return resolveThemeCss({
    primary_color: BRAND_DEFAULT.primary,
    background_color: BRAND_DEFAULT.background,
    accent_color: BRAND_DEFAULT.accent,
  });
}

/**
 * Flat CSS custom properties for `<html style={...}>`.
 * Edge-safe (no Node APIs).
 */
export function themeToCssProperties(
  theme: RestaurantThemeCss
): Record<string, string> {
  const props: Record<string, string> = {
    "--color-primary": theme.primary_color,
    "--color-bg": theme.background_color,
    "--color-accent": theme.accent_color,
    "--color-primary-rgb": theme.scaleRgb[600],
    "--color-bg-rgb": theme.backgroundRgb,
    "--color-accent-rgb": theme.accentRgb,
  };

  (
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
  ).forEach((step) => {
    props[`--halal-${step}`] = theme.scaleRgb[step];
  });

  return props;
}

/** Assert palette AA contrasts (dev / tests). */
export function assertPaletteAccessibility(): {
  ok: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  for (let i = 0; i < RESTAURANT_THEME_PALETTE.length; i++) {
    const p = RESTAURANT_THEME_PALETTE[i];
    if (!passesWcagAa("#ffffff", p.primary)) {
      failures.push(
        `[${i}] white on primary ${p.primary} = ${contrastRatio("#ffffff", p.primary).toFixed(2)}`
      );
    }
    if (!passesWcagAa(p.accent, p.background)) {
      failures.push(
        `[${i}] accent ${p.accent} on bg ${p.background} = ${contrastRatio(p.accent, p.background).toFixed(2)}`
      );
    }
  }
  return { ok: failures.length === 0, failures };
}
