/**
 * Colour maths. Two callers need it: the hand-written theme registry (deriving
 * borders and the second surface from a theme's base colours) and the generated
 * flag palettes, which have to *find* a usable palette from two or three raw
 * flag colours. Keeping it in one place means both walk the same path from a hex
 * string to a contrast-checked colour.
 *
 * Everything is plain sRGB maths — no colour space conversion, no dependency.
 * The contrast ratio follows WCAG 2 relative luminance, which is what the flag
 * test asserts against.
 */

export type Rgb = readonly [number, number, number];

export function parseHex(hex: string): Rgb {
  const value = hex.replace("#", "").trim();
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

export function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Mix `a` toward `b` by `amount` (0–1). */
export function mix(a: string, b: string, amount: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return toHex([
    ca[0] + (cb[0] - ca[0]) * amount,
    ca[1] + (cb[1] - ca[1]) * amount,
    ca[2] + (cb[2] - ca[2]) * amount,
  ]);
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, "#ffffff", amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, "#000000", amount);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const linear = parseHex(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** WCAG contrast ratio between two colours, 1 (identical) to 21 (black/white). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * A colour in HSL: hue in degrees 0–360, saturation and lightness 0–1. Greys
 * report a hue of 0 and a saturation of 0, so callers that care about hue have
 * to check the saturation first.
 */
export function hslOf(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = parseHex(hex).map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l };

  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  return { h: ((h * 60) + 360) % 360, s: l > 0.5 ? delta / (2 - max - min) : delta / (max + min), l };
}

/** HSL saturation, 0 (grey) to 1 (vivid). */
export function saturation(hex: string): number {
  return hslOf(hex).s;
}

/** HSL lightness, 0 (black) to 1 (white). */
export function lightnessOf(hex: string): number {
  return hslOf(hex).l;
}

/** HSL hue in degrees, 0–360. Greys report 0. */
export function hueOf(hex: string): number {
  return hslOf(hex).h;
}

/**
 * The same hue and saturation at a different lightness. Mixing toward black to
 * darken a colour drains its chroma — Argentina's celeste turns to slate — while
 * this keeps the colour recognisable, which is what a flag palette needs from
 * its page colour.
 */
export function withLightness(hex: string, lightness: number): string {
  const { h, s } = hslOf(hex);
  const l = Math.max(0, Math.min(1, lightness));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  const channels =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];

  return toHex([(channels[0] + m) * 255, (channels[1] + m) * 255, (channels[2] + m) * 255]);
}

/** Shortest distance between two hues, 0–180 degrees. */
export function hueDistance(a: string, b: string): number {
  const raw = Math.abs(hueOf(a) - hueOf(b));
  return Math.min(raw, 360 - raw);
}

/**
 * Walk a colour toward white or black in small steps, stopping the moment it
 * clears `ratio` against `background`.
 *
 * Unlike the ensure* helpers, which walk to a luminance ceiling and overshoot,
 * this stops at the first passing colour — the smallest departure that is
 * readable, which is what keeps a flag's accent recognisably the flag's own.
 * Returns the fully walked colour if the floor is never reached; callers decide
 * what to do with a miss (usually try the other direction).
 */
export function ensureContrastToward(
  hex: string,
  background: string,
  ratio: number,
  direction: "light" | "dark",
): string {
  let current = hex;
  for (let step = 0; step < 50; step += 1) {
    if (contrastRatio(current, background) >= ratio) return current;
    current = direction === "light" ? lighten(current, 0.05) : darken(current, 0.05);
  }
  return current;
}

/**
 * Push a colour darker until its luminance is at most `target`. Bounded so a
 * pathological input (pure black is already fine) still terminates.
 */
export function ensureDarkerThan(hex: string, target: number): string {
  let current = hex;
  for (let step = 0; step < 40 && luminance(current) > target; step += 1) {
    current = darken(current, 0.08);
  }
  return current;
}

/** Push a colour lighter until its luminance is at least `target`. */
export function ensureLighterThan(hex: string, target: number): string {
  let current = hex;
  for (let step = 0; step < 40 && luminance(current) < target; step += 1) {
    current = lighten(current, 0.08);
  }
  return current;
}
