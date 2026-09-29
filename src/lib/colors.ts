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

/** HSL saturation, 0 (grey) to 1 (vivid). */
export function saturation(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const lightness = (max + min) / 2;
  return lightness > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
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

/** Push a colour toward white until it reaches `ratio` against `background`. */
export function ensureContrastAgainst(hex: string, background: string, ratio: number): string {
  let current = hex;
  for (let step = 0; step < 40 && contrastRatio(current, background) < ratio; step += 1) {
    current = lighten(current, 0.08);
  }
  return current;
}
