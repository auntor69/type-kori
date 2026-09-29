/**
 * Client-side wiring for settings: resolve the theme, publish the choices the
 * interface needs as CSS custom properties, and tell other islands about changes.
 *
 * Only imported from islands. The no-flash inline script in the base layout does
 * the same first step in plain JavaScript, before paint.
 */

import { loadSettings, saveSettings, type Settings, type ThemeChoice } from "./settings";
import { applyThemeVars, getTheme, themeStyleVars, type ThemeDef } from "./themes";
import { availableStorage } from "./storage";

export const SETTINGS_EVENT = "tk:settings";

/** Marks the root while the settings drawer is open, so typing pauses. */
export const DRAWER_ATTRIBUTE = "data-tk-drawer";

export type ResolvedTheme = "light" | "dark";

export function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(theme: ThemeChoice): ResolvedTheme {
  if (theme === "system") return prefersDark() ? "dark" : "light";
  return getTheme(theme).dark ? "dark" : "light";
}

export function applySettings(settings: Settings, root: HTMLElement = document.documentElement): void {
  // A concrete theme overrides the token palette outright; "system" falls back
  // to the built-in light/dark pair from tokens.css.
  if (settings.theme === "system") {
    for (const name of THEME_VAR_NAMES) root.style.removeProperty(name);
    root.dataset.theme = resolveTheme("system");
  } else {
    const theme = getTheme(settings.theme);
    applyThemeVars(theme, root);
    root.dataset.theme = theme.dark ? "dark" : "light";
  }

  root.style.setProperty("--typing-size", `${settings.fontSize}px`);
  root.dataset.inputMode = settings.inputMode;
}

/**
 * The custom properties a concrete theme sets, so "system" can clear them.
 * Exported so a test can prove it still matches `themeStyleVars`: a theme that
 * set a property this list does not clear would survive the switch back to
 * "system" and tint the default palette with the last theme's colour.
 */
export const THEME_VAR_NAMES = [
  "--bg",
  "--surface",
  "--text",
  "--muted",
  "--accent",
  "--accent-soft",
  "--wrong",
  "--correct",
  "--focus-ring",
  "--accent-2",
  "--surface-2",
  "--border",
  "--border-strong",
] as const;

export function loadAndApplySettings(): Settings {
  const settings = loadSettings();
  applySettings(settings);
  return settings;
}

export function emitSettings(settings: Settings): void {
  window.dispatchEvent(new CustomEvent<Settings>(SETTINGS_EVENT, { detail: settings }));
}

/** Persist, apply and broadcast in one step. Returns false if storage failed. */
export function updateSettings(settings: Settings): boolean {
  const stored = saveSettings(settings);
  applySettings(settings);
  if (settings.theme !== "system") cacheThemePalette(getTheme(settings.theme));
  emitSettings(settings);
  return stored;
}

/**
 * Serialise a theme's palette so the no-flash inline script can apply it before
 * any module loads. One key per theme, tiny, and rewritten on every change.
 */
function cacheThemePalette(theme: ThemeDef): void {
  try {
    const snapshot: Record<string, string | boolean> = {
      ...themeStyleVars(theme),
      __dark: theme.dark,
    };
    availableStorage().setItem(`tk:v1:theme:${theme.id}`, JSON.stringify(snapshot));
  } catch {
    // Cosmetic only: the app still applies the theme after hydration.
  }
}

export function onSettingsChange(listener: (settings: Settings) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<Settings>).detail;
    if (detail) listener(detail);
  };

  window.addEventListener(SETTINGS_EVENT, handler);
  return () => window.removeEventListener(SETTINGS_EVENT, handler);
}

/** Re-apply when the OS switches theme while the choice is "system". */
export function watchSystemTheme(getSettings: () => Settings): () => void {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    const settings = getSettings();
    if (settings.theme === "system") applySettings(settings);
  };

  query.addEventListener("change", handler);
  return () => query.removeEventListener("change", handler);
}

/**
 * Overlays that are open, by name. The typing island stops reading keystrokes
 * while the attribute is set, and two overlays closing in either order must not
 * cancel each other out — hence a set rather than a boolean.
 */
const openOverlays = new Set<string>();

export function setOverlayOpen(name: string, open: boolean): void {
  if (open) openOverlays.add(name);
  else openOverlays.delete(name);

  const root = document.documentElement;
  if (openOverlays.size > 0) {
    root.setAttribute(DRAWER_ATTRIBUTE, "open");
    // Focus mode fades the chrome out; the overlays live inside that chrome, so
    // the fade has to stand down while one of them is open or the dialog would
    // be invisible and unclickable.
    root.setAttribute(OVERLAY_ATTRIBUTE, "open");
  } else {
    root.removeAttribute(DRAWER_ATTRIBUTE);
    root.removeAttribute(OVERLAY_ATTRIBUTE);
  }
}

export const OVERLAY_ATTRIBUTE = "data-tk-overlay";
