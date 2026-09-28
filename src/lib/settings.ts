/**
 * Settings persistence. Everything stays in the browser: there is no account, no
 * backend and no cookie. Keys are versioned (`tk:v1:…`) so a future schema can
 * migrate instead of guessing.
 */

import type { InputEngineId } from "../engine/input/types";
import type { Difficulty } from "../engine/text/provider";
import { languages, type Lang } from "../i18n";

export const STORAGE_PREFIX = "tk:v1:";
export const SETTINGS_KEY = `${STORAGE_PREFIX}settings`;

export type ThemeChoice = "light" | "dark" | "system";

export interface Settings {
  lang: Lang;
  theme: ThemeChoice;
  fontSize: number;
  inputMode: InputEngineId;
  difficulty: Difficulty | "all";
}

export const FONT_SIZE_MIN = 20;
export const FONT_SIZE_MAX = 48;

export const defaultSettings: Settings = {
  lang: "bn",
  theme: "system",
  fontSize: 28,
  // Built-in phonetic mode becomes the default in Phase 3, once it exists.
  inputMode: "system",
  difficulty: "all",
};

export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) return defaultSettings.fontSize;
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(value)));
}

function isTheme(value: unknown): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

function isInputMode(value: unknown): value is InputEngineId {
  return value === "system" || value === "avro-phonetic";
}

function isDifficulty(value: unknown): value is Difficulty | "all" {
  return value === "easy" || value === "medium" || value === "hard" || value === "all";
}

/** Merge a stored value with the defaults, ignoring anything malformed. */
export function parseSettings(raw: unknown): Settings {
  if (typeof raw !== "object" || raw === null) return { ...defaultSettings };
  const value = raw as Partial<Settings>;

  return {
    lang: languages.includes(value.lang as Lang) ? (value.lang as Lang) : defaultSettings.lang,
    theme: isTheme(value.theme) ? value.theme : defaultSettings.theme,
    fontSize: clampFontSize(typeof value.fontSize === "number" ? value.fontSize : defaultSettings.fontSize),
    inputMode: isInputMode(value.inputMode) ? value.inputMode : defaultSettings.inputMode,
    difficulty: isDifficulty(value.difficulty) ? value.difficulty : defaultSettings.difficulty,
  };
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Used when the browser refuses storage (private mode, quota, disabled). */
export function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

const memoryFallback = createMemoryStorage();

/**
 * `localStorage` when it actually works, an in-memory store otherwise. Writing is
 * probed because some browsers expose the object and then throw on `setItem`.
 */
export function availableStorage(): StorageAdapter {
  try {
    const probe = `${STORAGE_PREFIX}probe`;
    globalThis.localStorage.setItem(probe, "1");
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return memoryFallback;
  }
}

export function loadSettings(storage: StorageAdapter = availableStorage()): Settings {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    return raw === null ? { ...defaultSettings } : parseSettings(JSON.parse(raw) as unknown);
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(
  settings: Settings,
  storage: StorageAdapter = availableStorage(),
): boolean {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** Remove every key this app owns. */
export function clearAppStorage(storage: StorageAdapter = availableStorage()): void {
  const keys: string[] = [];
  for (let index = 0; index < storageLength(storage); index += 1) {
    const key = storageKey(storage, index);
    if (key !== null && key.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

function storageLength(storage: StorageAdapter): number {
  const candidate = storage as StorageAdapter & { length?: number };
  return typeof candidate.length === "number" ? candidate.length : 0;
}

function storageKey(storage: StorageAdapter, index: number): string | null {
  const candidate = storage as StorageAdapter & { key?: (index: number) => string | null };
  return typeof candidate.key === "function" ? candidate.key(index) : null;
}
