/**
 * Settings persistence. The storage primitives live in `./storage`; this module
 * knows the settings schema and how to repair a stored value that does not match
 * it.
 */

import type { InputEngineId } from "../engine/input/types";
import type { Difficulty } from "../engine/text/provider";
import { languages, type Lang } from "../i18n";
import {
  STORAGE_PREFIX,
  availableStorage,
  readJson,
  writeJson,
  type StorageAdapter,
} from "./storage";

export { STORAGE_PREFIX };
export { availableStorage, clearAppStorage, createMemoryStorage } from "./storage";
export type { StorageAdapter } from "./storage";

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
  // The system keyboard stays the default: it needs nothing installed, it works
  // with every layout the user already has, and it makes no claim the app cannot
  // keep. Built-in phonetic mode is an opt-in preview (see docs/DECISIONS.md).
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

export function loadSettings(storage: StorageAdapter = availableStorage()): Settings {
  return readJson(SETTINGS_KEY, parseSettings, storage) ?? { ...defaultSettings };
}

export function saveSettings(
  settings: Settings,
  storage: StorageAdapter = availableStorage(),
): boolean {
  return writeJson(SETTINGS_KEY, settings, storage);
}
