/**
 * Theme registry. Each entry overrides the colour tokens from Section 6 at
 * runtime by setting the CSS custom properties on the root, exactly the way the
 * monkeytype theme switcher works: pick a row, the whole page recolours.
 *
 * `dark` marks whether a theme is a dark theme; it is only used for the swatch
 * rendering and for keeping `color-scheme` correct (scrollbars, form controls).
 * Every theme defines both values for every token — there is no light/dark
 * duality here, a theme is one concrete look.
 */

export interface ThemeDef {
  id: string;
  dark: boolean;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  wrong: string;
}

export const themes: readonly ThemeDef[] = [
  // ——— The built-ins: the Section 6 palettes ———
  { id: "serika", dark: true, bg: "#2c2e31", surface: "#323437", text: "#d1d0c9", muted: "#646669", accent: "#e2b714", accentSoft: "#3a3c40", wrong: "#ca4754" },
  { id: "paper", dark: false, bg: "#fafaf9", surface: "#ffffff", text: "#1a1d20", muted: "#6b7280", accent: "#0e7c5a", accentSoft: "#e7f2ed", wrong: "#d92d3f" },

  // ——— Warm charcoals ———
  { id: "carbon", dark: true, bg: "#1d1d1f", surface: "#2a2a2e", text: "#e8e6e1", muted: "#6e6e73", accent: "#ff9f0a", accentSoft: "#3a2f1e", wrong: "#ff453a" },
  { id: "gruvbox", dark: true, bg: "#282828", surface: "#32302f", text: "#ebdbb2", muted: "#928374", accent: "#b8bb26", accentSoft: "#3d3a34", wrong: "#fb4934" },
  { id: "coffee", dark: true, bg: "#1a1518", surface: "#241d21", text: "#e8d5c4", muted: "#8a7568", accent: "#d9a05b", accentSoft: "#3d3128", wrong: "#c95555" },
  { id: "mocha", dark: true, bg: "#302d29", surface: "#3a3631", text: "#e7dfd3", muted: "#8d8578", accent: "#dfa376", accentSoft: "#423a31", wrong: "#d36c5f" },

  // ——— Cool and calm ———
  { id: "nord", dark: true, bg: "#2e3440", surface: "#3b4252", text: "#eceff4", muted: "#7b88a1", accent: "#88c0d0", accentSoft: "#3b4a5a", wrong: "#bf616a" },
  { id: "ocean", dark: true, bg: "#0f1b2d", surface: "#16263d", text: "#d6e4f0", muted: "#5f7690", accent: "#4cc2ff", accentSoft: "#1c3450", wrong: "#ff6b7a" },
  { id: "mint", dark: true, bg: "#10201c", surface: "#182b26", text: "#d7e8e0", muted: "#5f7f74", accent: "#5eead4", accentSoft: "#1c3830", wrong: "#f87171" },
  { id: "lavender", dark: true, bg: "#221f2e", surface: "#2c2839", text: "#e3dff0", muted: "#8a84a3", accent: "#b8a7f4", accentSoft: "#37304a", wrong: "#e57a8b" },

  // ——— Lights ———
  { id: "daylight", dark: false, bg: "#ffffff", surface: "#f5f5f4", text: "#1c1917", muted: "#78716c", accent: "#2563eb", accentSoft: "#dbeafe", wrong: "#dc2626" },
  { id: "sand", dark: false, bg: "#f6f1e7", surface: "#fffdf7", text: "#3d3428", muted: "#8a7d68", accent: "#b4703a", accentSoft: "#efe2cf", wrong: "#c0392b" },
  { id: "breeze", dark: false, bg: "#eef6f4", surface: "#ffffff", text: "#17322d", muted: "#5c7a72", accent: "#0d8a72", accentSoft: "#d3ece5", wrong: "#d14545" },
  { id: "sakura", dark: false, bg: "#faf0f2", surface: "#ffffff", text: "#402a30", muted: "#9a7b84", accent: "#c2527a", accentSoft: "#f5dbe3", wrong: "#b03a48" },

  // ——— High-contrast statements ———
  { id: "terminal", dark: true, bg: "#000000", surface: "#0d0d0d", text: "#33ff66", muted: "#1f9940", accent: "#33ff66", accentSoft: "#0c2917", wrong: "#ff3355" },
  { id: "amber", dark: true, bg: "#100c02", surface: "#1a1405", text: "#ffb000", muted: "#8a6a10", accent: "#ffb000", accentSoft: "#33230a", wrong: "#ff5533" },
  { id: "ink", dark: false, bg: "#f4f4f5", surface: "#ffffff", text: "#09090b", muted: "#71717a", accent: "#09090b", accentSoft: "#e4e4e7", wrong: "#dc2626" },
  { id: "matcha", dark: false, bg: "#eef0e5", surface: "#fbfcf6", text: "#2c3325", muted: "#77806a", accent: "#6b8f3e", accentSoft: "#dfe8cd", wrong: "#b5503c" },
];

export type ThemeId = (typeof themes)[number]["id"];

const themeIds = new Set<string>(themes.map((theme) => theme.id));

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && themeIds.has(value);
}

export function getTheme(id: string): ThemeDef {
  return themes.find((theme) => theme.id === id) ?? themes[0];
}

/**
 * The full set of CSS custom properties a theme overrides, including the
 * derived line/surface colours. Used by `applyThemeVars` at runtime and by the
 * no-flash snapshot writer.
 */
export function themeStyleVars(theme: ThemeDef): Record<string, string> {
  return {
    "--bg": theme.bg,
    "--surface": theme.surface,
    "--text": theme.text,
    "--muted": theme.muted,
    "--accent": theme.accent,
    "--accent-soft": theme.accentSoft,
    "--wrong": theme.wrong,
    "--correct": theme.text,
    "--focus-ring": theme.accent,
    "--accent-2": theme.wrong,
    "--surface-2": theme.dark ? lighten(theme.surface, 0.05) : darken(theme.surface, 0.04),
    "--border": theme.dark ? lighten(theme.bg, 0.07) : darken(theme.bg, 0.08),
    "--border-strong": theme.dark ? lighten(theme.bg, 0.14) : darken(theme.bg, 0.16),
  };
}

/**
 * Apply a theme by overriding the colour custom properties. Called from
 * `applySettings`; the no-flash inline bootstrap uses the cached snapshot.
 */
export function applyThemeVars(theme: ThemeDef, root: HTMLElement): void {
  for (const [name, value] of Object.entries(themeStyleVars(theme))) {
    root.style.setProperty(name, value);
  }
  root.style.colorScheme = theme.dark ? "dark" : "light";
}

/** Mix a hex colour toward white by `amount` (0–1). */
function lighten(hex: string, amount: number): string {
  return mix(hex, "#ffffff", amount);
}

/** Mix a hex colour toward black by `amount` (0–1). */
function darken(hex: string, amount: number): string {
  return mix(hex, "#000000", amount);
}

function mix(a: string, b: string, amount: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const channel = (i: number) => Math.round(ca[i] + (cb[i] - ca[i]) * amount);
  return `#${[0, 1, 2].map((i) => channel(i).toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
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
