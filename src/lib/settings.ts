/**
 * Settings persistence. The storage primitives live in `./storage`; this module
 * knows the settings schema and how to repair a stored value that does not match
 * it.
 */

import type { InputEngineId } from "../engine/input/types";
import type { Difficulty } from "../engine/text/provider";
import { languages, type Lang } from "../i18n";
import { isFunboxMode, type FunboxMode } from "./funbox";
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

/** How numbers in stats and results are rendered. */
export type NumeralStyle = "latin" | "bengali";

/** Which key throws the current text away and starts over. */
export type QuickRestart = "off" | "esc" | "tab" | "enter";

/** How much backspacing is allowed: within a word, or not at all. */
export type ConfidenceMode = "off" | "on" | "max";

/** Where a wrong letter is shown: nowhere, under the word, or in place. */
export type IndicateTypos = "off" | "below" | "replace";

/** How much already-typed text the results screen lists back. */
export type WordHistory = "off" | "recent" | "always";

export const QUICK_RESTART_KEYS: readonly QuickRestart[] = ["off", "esc", "tab", "enter"];
export const CONFIDENCE_MODES: readonly ConfidenceMode[] = ["off", "on", "max"];
export const INDICATE_TYPOS_STYLES: readonly IndicateTypos[] = ["off", "below", "replace"];
export const WORD_HISTORY_MODES: readonly WordHistory[] = ["off", "recent", "always"];

/** Minimum-speed presets. `0` means the test cannot fail on speed. */
export const MIN_WPM_CHOICES: readonly number[] = [0, 20, 30, 40, 50, 60];
/** Minimum-accuracy presets. `0` means the test cannot fail on accuracy. */
export const MIN_ACCURACY_CHOICES: readonly number[] = [0, 70, 80, 90, 95];

export const SOUND_VOLUME_MIN = 0;
export const SOUND_VOLUME_MAX = 100;

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
  /** Render stats and results with Bengali numerals (০১২…). */
  numerals: NumeralStyle;
  /** Keystroke feedback sound. */
  sound: "off" | "click" | "error" | "both";
  /** Loudness of the synthesized feedback, 0–100. */
  soundVolume: number;
  /** Which key restarts the test: Esc by default, or Tab / Enter. */
  quickRestart: QuickRestart;
  /** Confidence mode locks backspacing once a word has been committed. */
  confidenceMode: ConfidenceMode;
  /** Show what was typed wrong: under the word, or in place of the letter. */
  indicateTypos: IndicateTypos;
  /** Do not draw letters typed past the end of a word. */
  hideExtraLetters: boolean;
  /** Fail the run if speed drops below this many words per minute. 0 = off. */
  minWpm: number;
  /** Fail the run if accuracy drops below this percentage. 0 = off. */
  minAccuracy: number;
  /** Whether the results screen lists the words that were typed. */
  wordHistory: WordHistory;
  /** Fade the surrounding chrome away while typing. */
  focusMode: boolean;
  /** Warn when the keyboard's caps lock is on — it changes Avro output. */
  capsLockWarning: boolean;
  /** Funbox twist applied to the generated word stream. */
  funbox: FunboxMode;
  /** Starred theme ids, shown first in the picker. */
  themeFavourites: ThemeId[];
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
  numerals: "latin",
  sound: "off",
  soundVolume: 60,
  quickRestart: "esc",
  confidenceMode: "off",
  indicateTypos: "off",
  hideExtraLetters: false,
  minWpm: 0,
  minAccuracy: 0,
  wordHistory: "off",
  focusMode: false,
  capsLockWarning: true,
  funbox: "none",
  themeFavourites: [],
};

export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) return defaultSettings.fontSize;
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(value)));
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return defaultSettings.soundVolume;
  return Math.min(SOUND_VOLUME_MAX, Math.max(SOUND_VOLUME_MIN, Math.round(value)));
}

/** A minimum threshold: `0` means the run cannot fail on it. */
function clampMinimum(value: number, cap: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(cap, Math.round(value));
}

/**
 * Confidence mode gates backspacing (Section 7.3.7's mistake repair): `on`
 * allows it only inside the word being typed, `max` refuses it outright.
 */
export function allowsBackspace(
  mode: ConfidenceMode,
  activeLength: number,
): boolean {
  if (mode === "max") return false;
  if (mode === "on") return activeLength > 0;
  return true;
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

function isNumeralStyle(value: unknown): value is NumeralStyle {
  return value === "latin" || value === "bengali";
}

function isSound(value: unknown): value is Settings["sound"] {
  return value === "off" || value === "click" || value === "error" || value === "both";
}

function isQuickRestart(value: unknown): value is QuickRestart {
  return value === "off" || value === "esc" || value === "tab" || value === "enter";
}

function isConfidenceMode(value: unknown): value is ConfidenceMode {
  return value === "off" || value === "on" || value === "max";
}

function isIndicateTypos(value: unknown): value is IndicateTypos {
  return value === "off" || value === "below" || value === "replace";
}

function isWordHistory(value: unknown): value is WordHistory {
  return value === "off" || value === "recent" || value === "always";
}

/** Starred themes: keep the valid ids, drop duplicates, cap the list. */
function parseFavourites(value: unknown): ThemeId[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((entry): entry is ThemeId => isThemeId(entry));
  return [...new Set(ids)].slice(0, 100);
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
    numerals: isNumeralStyle(value.numerals) ? value.numerals : defaultSettings.numerals,
    sound: isSound(value.sound) ? value.sound : defaultSettings.sound,
    soundVolume: clampVolume(
      typeof value.soundVolume === "number" ? value.soundVolume : defaultSettings.soundVolume,
    ),
    quickRestart: isQuickRestart(value.quickRestart)
      ? value.quickRestart
      : defaultSettings.quickRestart,
    confidenceMode: isConfidenceMode(value.confidenceMode)
      ? value.confidenceMode
      : defaultSettings.confidenceMode,
    indicateTypos: isIndicateTypos(value.indicateTypos)
      ? value.indicateTypos
      : defaultSettings.indicateTypos,
    hideExtraLetters:
      typeof value.hideExtraLetters === "boolean"
        ? value.hideExtraLetters
        : defaultSettings.hideExtraLetters,
    minWpm: clampMinimum(typeof value.minWpm === "number" ? value.minWpm : 0, 300),
    minAccuracy: clampMinimum(typeof value.minAccuracy === "number" ? value.minAccuracy : 0, 100),
    wordHistory: isWordHistory(value.wordHistory) ? value.wordHistory : defaultSettings.wordHistory,
    focusMode: typeof value.focusMode === "boolean" ? value.focusMode : defaultSettings.focusMode,
    capsLockWarning:
      typeof value.capsLockWarning === "boolean"
        ? value.capsLockWarning
        : defaultSettings.capsLockWarning,
    funbox: isFunboxMode(value.funbox) ? value.funbox : defaultSettings.funbox,
    themeFavourites: parseFavourites(value.themeFavourites),
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
