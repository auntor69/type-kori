/**
 * Custom text: paste your own Bangla text and practise it (Section 4.8).
 *
 * Three things matter here.
 *
 * 1. The text never leaves the device, so it lives under the same versioned
 *    storage prefix as everything else and is part of the backup file.
 * 2. It is validated before it can start a run: Bangla only, inside a length
 *    limit. A run scores against the target it was built from, so a target with
 *    Latin words or an emoji in it would make nonsense of the numbers.
 * 3. It is deliberately *not* library content. It carries no review flag anyone
 *    could confuse with the curated texts in `content/`, and the build-time
 *    validator never sees it.
 */

import type { PracticeText } from "../engine/text/provider";
import {
  countCodePoints,
  hasLatinLetters,
  isBanglaOnly,
  normalizeText,
  splitWords,
} from "../engine/unicode";
import {
  STORAGE_PREFIX,
  availableStorage,
  readJson,
  removeKey,
  writeJson,
  type StorageAdapter,
} from "./storage";

export const CUSTOM_TEXT_KEY = `${STORAGE_PREFIX}custom`;

/** The id every custom run records, so the progress page can label it. */
export const CUSTOM_TEXT_ID = "custom";

/**
 * Section 5.2 asks for a validated paste with length limits. These are the
 * limits: fewer than a dozen clusters is not a run, and a very long paste would
 * be a slog nobody finishes, while still being small enough to store.
 */
export const CUSTOM_MIN_CHARS = 12;
export const CUSTOM_MAX_CHARS = 1200;
export const CUSTOM_MIN_WORDS = 3;
export const CUSTOM_MAX_WORDS = 200;

export type CustomProblem =
  | "empty"
  | "latin"
  | "notBangla"
  | "tooShort"
  | "tooLong"
  | "wordRange";

export interface CustomTextCheck {
  /** The cleaned text, ready to practise. */
  text: string;
  /** Code points and words, as counted for the limits. */
  chars: number;
  words: number;
  problems: CustomProblem[];
  /** True when there is no problem left. */
  ok: boolean;
}

export interface StoredCustomText {
  text: string;
  savedAt: number;
}

/**
 * Bring pasted text into the shape a run expects: NFC (so a nukta form compares
 * equal however it was copied), every whitespace run - newlines and tabs
 * included - collapsed to one space, and no leading or trailing space. Newlines
 * are flattened on purpose: the typing area lays the text out itself.
 */
export function cleanCustomText(raw: string): string {
  if (typeof raw !== "string") return "";
  return normalizeText(raw).replace(/\s+/gu, " ").trim();
}

/** Validate a paste, and report every problem rather than only the first. */
export function checkCustomText(raw: string): CustomTextCheck {
  const text = cleanCustomText(raw);

  if (text.length === 0) {
    return { text, chars: 0, words: 0, problems: ["empty"], ok: false };
  }

  const problems: CustomProblem[] = [];

  // Latin letters get their own message: pasting English by mistake is the
  // common case, and "use Bangla text only" is clearer than "not Bangla".
  if (hasLatinLetters(text)) problems.push("latin");
  else if (!isBanglaOnly(text)) problems.push("notBangla");

  const chars = countCodePoints(text);
  const words = splitWords(text).length;

  if (chars < CUSTOM_MIN_CHARS) problems.push("tooShort");
  else if (chars > CUSTOM_MAX_CHARS) problems.push("tooLong");

  if (words < CUSTOM_MIN_WORDS || words > CUSTOM_MAX_WORDS) problems.push("wordRange");

  return { text, chars, words, problems, ok: problems.length === 0 };
}

/**
 * The text as the runner sees it. `reviewed` is set because the flag asks
 * whether a native speaker checked text *this project* wrote; the user's own
 * paste is not ours to review, and the build-time validator never reads it.
 */
export function customPracticeText(raw: string): PracticeText {
  return {
    id: CUSTOM_TEXT_ID,
    text: cleanCustomText(raw),
    difficulty: "medium",
    topic: "custom",
    source: "custom",
    reviewed: true,
  };
}

/** Read a stored value, dropping anything that no longer validates. */
export function parseStoredCustomText(raw: unknown): StoredCustomText | null {
  if (typeof raw !== "object" || raw === null) return null;

  const value = raw as Partial<StoredCustomText>;
  if (typeof value.text !== "string") return null;

  const check = checkCustomText(value.text);
  if (!check.ok) return null;

  return {
    text: check.text,
    savedAt: typeof value.savedAt === "number" && Number.isFinite(value.savedAt) ? value.savedAt : 0,
  };
}

export function loadCustomText(storage: StorageAdapter = availableStorage()): StoredCustomText | null {
  return readJson(CUSTOM_TEXT_KEY, parseStoredCustomText, storage);
}

/**
 * Store a paste. Returns the stored value, or null when the text is invalid or
 * storage refused the write, so the caller can tell the user their text will not
 * survive a reload instead of failing silently.
 */
export function saveCustomText(
  raw: string,
  savedAt: number = Date.now(),
  storage: StorageAdapter = availableStorage(),
): StoredCustomText | null {
  const check = checkCustomText(raw);
  if (!check.ok) return null;

  const stored: StoredCustomText = { text: check.text, savedAt };
  return writeJson(CUSTOM_TEXT_KEY, stored, storage) ? stored : null;
}

export function clearCustomText(storage: StorageAdapter = availableStorage()): void {
  removeKey(CUSTOM_TEXT_KEY, storage);
}
