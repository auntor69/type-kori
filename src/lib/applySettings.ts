/**
 * Client-side wiring for settings: resolve the theme, publish the choices the
 * interface needs as CSS custom properties, and tell other islands about changes.
 *
 * Only imported from islands. The no-flash inline script in the base layout does
 * the same first step in plain JavaScript, before paint.
 */

import { loadSettings, saveSettings, type Settings, type ThemeChoice } from "./settings";

export const SETTINGS_EVENT = "tk:settings";

/** Marks the root while the settings drawer is open, so typing pauses. */
export const DRAWER_ATTRIBUTE = "data-tk-drawer";

export type ResolvedTheme = "light" | "dark";

export function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(theme: ThemeChoice): ResolvedTheme {
  return theme === "system" ? (prefersDark() ? "dark" : "light") : theme;
}

export function applySettings(settings: Settings, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = resolveTheme(settings.theme);
  root.style.setProperty("--typing-size", `${settings.fontSize}px`);
  root.dataset.inputMode = settings.inputMode;
}

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
  emitSettings(settings);
  return stored;
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

export function setDrawerOpen(open: boolean): void {
  if (open) document.documentElement.setAttribute(DRAWER_ATTRIBUTE, "open");
  else document.documentElement.removeAttribute(DRAWER_ATTRIBUTE);
}
