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

  // ——— Community classics ———
  { id: "dracula", dark: true, bg: "#282a36", surface: "#343746", text: "#f8f8f2", muted: "#6272a4", accent: "#bd93f9", accentSoft: "#3a3d4f", wrong: "#ff5555" },
  { id: "tokyonight", dark: true, bg: "#1a1b26", surface: "#24283b", text: "#c0caf5", muted: "#565f89", accent: "#7aa2f7", accentSoft: "#2c3252", wrong: "#f7768e" },
  { id: "catppuccin", dark: true, bg: "#1e1e2e", surface: "#282839", text: "#cdd6f4", muted: "#6c7086", accent: "#f5c2e7", accentSoft: "#33334a", wrong: "#f38ba8" },
  { id: "rosepine", dark: true, bg: "#191724", surface: "#1f1d2e", text: "#e0def4", muted: "#6e6a86", accent: "#c4a7e7", accentSoft: "#2a283f", wrong: "#eb6f92" },
  { id: "everforest", dark: true, bg: "#2b3339", surface: "#343f44", text: "#d3c6aa", muted: "#7a8478", accent: "#a7c080", accentSoft: "#3d4a43", wrong: "#e67e80" },
  { id: "onedark", dark: true, bg: "#282c34", surface: "#333842", text: "#abb2bf", muted: "#5c6370", accent: "#61afef", accentSoft: "#323844", wrong: "#e06c75" },
  { id: "solarizeddark", dark: true, bg: "#002b36", surface: "#073642", text: "#eee8d5", muted: "#586e75", accent: "#b58900", accentSoft: "#0a4652", wrong: "#dc322f" },
  { id: "solarizedlight", dark: false, bg: "#fdf6e3", surface: "#eee8d5", text: "#073642", muted: "#93a1a1", accent: "#b58900", accentSoft: "#e8e1cb", wrong: "#dc322f" },
  { id: "githubdark", dark: true, bg: "#0d1117", surface: "#161b22", text: "#e6edf3", muted: "#7d8590", accent: "#2f81f7", accentSoft: "#1c2739", wrong: "#f85149" },
  { id: "monokai", dark: true, bg: "#272822", surface: "#32332c", text: "#f8f8f2", muted: "#75715e", accent: "#a6e22e", accentSoft: "#35372f", wrong: "#f92672" },
  { id: "synthwave", dark: true, bg: "#241b2f", surface: "#2f2438", text: "#f7f7fb", muted: "#7b6f8e", accent: "#ff7edb", accentSoft: "#3b2d49", wrong: "#fe4450" },
  { id: "cyberpunk", dark: true, bg: "#0a0a14", surface: "#12121f", text: "#e9e9f0", muted: "#5b5b76", accent: "#00f0ff", accentSoft: "#0f2a33", wrong: "#ff2a6d" },
  { id: "radical", dark: true, bg: "#141321", surface: "#1c1b2e", text: "#e5e0f0", muted: "#5d5778", accent: "#fe4450", accentSoft: "#2b2036", wrong: "#ffb454" },

  // ——— Special for this project ———
  { id: "bd", dark: true, bg: "#00423a", surface: "#005449", text: "#f4f0e6", muted: "#6d9c92", accent: "#f42a41", accentSoft: "#0b5850", wrong: "#ff7b6b" },
  { id: "shapla", dark: false, bg: "#f7f4ee", surface: "#ffffff", text: "#2f3136", muted: "#8b8fa3", accent: "#006a4e", accentSoft: "#dcefe8", wrong: "#c0392b" },
  { id: "duel", dark: true, bg: "#1a1a2e", surface: "#232341", text: "#eaeaf2", muted: "#6f6f8f", accent: "#e94560", accentSoft: "#32264a", wrong: "#f7b32b" },
  { id: "fractal", dark: true, bg: "#0c0c14", surface: "#15151f", text: "#c9c9e8", muted: "#55557a", accent: "#8a5cff", accentSoft: "#211a3d", wrong: "#ff5c8a" },
  { id: "mentalist", dark: true, bg: "#1f1c1b", surface: "#2a2524", text: "#eee6e2", muted: "#80746f", accent: "#f2b035", accentSoft: "#3d332a", wrong: "#e25d5d" },
  { id: "alduin", dark: true, bg: "#181818", surface: "#242424", text: "#e8d3a5", muted: "#7f7464", accent: "#e6c545", accentSoft: "#332f22", wrong: "#d9736f" },
  { id: "flexoki", dark: true, bg: "#100f0c", surface: "#1c1b18", text: "#cecdc3", muted: "#78766a", accent: "#da702c", accentSoft: "#30281f", wrong: "#d14d41" },
  { id: "metropolis", dark: true, bg: "#1d1d26", surface: "#272733", text: "#e6e6ef", muted: "#70708a", accent: "#8be9fd", accentSoft: "#2b3843", wrong: "#ff6188" },
  { id: "dorsom", dark: true, bg: "#17181f", surface: "#212230", text: "#d8dee9", muted: "#5f6b7f", accent: "#88c0d0", accentSoft: "#263340", wrong: "#bf616a" },
  { id: "nightfoil", dark: true, bg: "#101418", surface: "#181d23", text: "#dde4ea", muted: "#5c6a76", accent: "#66d9c2", accentSoft: "#1e3230", wrong: "#f0687a" },
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
