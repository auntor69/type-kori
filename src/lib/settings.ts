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
import { isThemeId, type ThemeId } from "./themes";

export { STORAGE_PREFIX };
export { availableStorage, clearAppStorage, createMemoryStorage } from "./storage";
export type { StorageAdapter } from "./storage";

export const SETTINGS_KEY = `${STORAGE_PREFIX}settings`;

/** How the theme choice behaves: follow the OS or a concrete palette id. */
export type ThemeChoice = "system" | ThemeId;

export type CaretStyle = "bar" | "underline" | "off";

export type StopOnError = "off" | "letter" | "word";

export interface Settings {
  lang: Lang;
  /** `system` follows the OS; otherwise a concrete theme id from themes.ts. */
  theme: ThemeChoice;
  fontSize: number;
  inputMode: InputEngineId;
  /** Which difficulties the text pool draws from. */
  difficulty: Difficulty | "all";
  /** Fails the run when a wrong cluster (`letter`) or wrong word (`word`) is committed. */
  stopOnError: StopOnError;
  /** Hide correctness colours entirely — raw speed only. */
  blindMode: boolean;
  /** Show live WPM while typing. */
  liveWpm: boolean;
  caretStyle: CaretStyle;
  /** Keep the previous line of words visible above the current one. */
  showAllLines: boolean;
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
  stopOnError: "off",
  blindMode: false,
  liveWpm: true,
  caretStyle: "bar",
  showAllLines: true,
};

export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) return defaultSettings.fontSize;
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(value)));
}

function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "system" || isThemeId(value);
}

function isInputMode(value: unknown): value is InputEngineId {
  return value === "system" || value === "avro-phonetic";
}

function isDifficulty(value: unknown): value is Difficulty | "all" {
  return value === "easy" || value === "medium" || value === "hard" || value === "all";
}

function isStopOnError(value: unknown): value is StopOnError {
  return value === "off" || value === "letter" || value === "word";
}

function isCaretStyle(value: unknown): value is CaretStyle {
  return value === "bar" || value === "underline" || value === "off";
}

/** Merge a stored value with the defaults, ignoring anything malformed. */
export function parseSettings(raw: unknown): Settings {
  if (typeof raw !== "object" || raw === null) return { ...defaultSettings };
  const value = raw as Partial<Settings>;

  return {
    lang: languages.includes(value.lang as Lang) ? (value.lang as Lang) : defaultSettings.lang,
    theme: isThemeChoice(value.theme) ? value.theme : defaultSettings.theme,
    fontSize: clampFontSize(typeof value.fontSize === "number" ? value.fontSize : defaultSettings.fontSize),
    inputMode: isInputMode(value.inputMode) ? value.inputMode : defaultSettings.inputMode,
    difficulty: isDifficulty(value.difficulty) ? value.difficulty : defaultSettings.difficulty,
    stopOnError: isStopOnError(value.stopOnError) ? value.stopOnError : defaultSettings.stopOnError,
    blindMode: typeof value.blindMode === "boolean" ? value.blindMode : defaultSettings.blindMode,
    liveWpm: typeof value.liveWpm === "boolean" ? value.liveWpm : defaultSettings.liveWpm,
    caretStyle: isCaretStyle(value.caretStyle) ? value.caretStyle : defaultSettings.caretStyle,
    showAllLines: typeof value.showAllLines === "boolean" ? value.showAllLines : defaultSettings.showAllLines,
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
