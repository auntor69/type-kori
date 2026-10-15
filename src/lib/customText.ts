/**
 * Custom text: your own Bangla passages, kept as a small named library so one
 * exam question does not overwrite the last one.
 *
 * Four things matter here.
 *
 * 1. The text never leaves the device, so it lives under the same versioned
 *    storage prefix as everything else and is part of the backup file.
 * 2. It is validated before it can start a run: Bangla only, inside a length
 *    limit. A run scores against the target it was built from, so a target with
 *    Latin words or an emoji in it would make nonsense of the numbers.
 * 3. Digits are allowed in either numeral system and can be *repaired* into the
 *    other one. An exam question carries the date and the marks (`২৫ নম্বর`), and
 *    rejecting a paste for containing `25` was never the rule anyone wanted —
 *    but a passage whose numerals do not match what the learner's keyboard
 *    produces can never be typed correctly either, so the paste is converted on
 *    request rather than silently. See `repairDigits`.
 * 4. It is deliberately *not* library content. It carries no review flag anyone
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

/** The key the single stored paste used before the library existed. */
export const CUSTOM_TEXT_KEY = `${STORAGE_PREFIX}custom`;
/** The library. The old key is migrated into it the first time it is read. */
export const CUSTOM_LIBRARY_KEY = `${STORAGE_PREFIX}customLibrary`;

/** The id every custom run records, so the progress page can label it. */
export const CUSTOM_TEXT_ID = "custom";

/**
 * Length and word limits. Fewer than a dozen clusters is not a run, and a very
 * long paste would be a slog nobody finishes, while still being small enough to
 * store: the whole library is capped at twenty of these.
 */
export const CUSTOM_MIN_CHARS = 12;
export const CUSTOM_MAX_CHARS = 1200;
export const CUSTOM_MIN_WORDS = 3;
export const CUSTOM_MAX_WORDS = 200;
/** How many named texts one browser keeps. Twenty pastes is a term's worth. */
export const CUSTOM_LIBRARY_MAX = 20;
/** A name is a label in a list, not a paragraph. */
export const CUSTOM_NAME_MAX = 40;

export type CustomProblem =
  | "empty"
  | "latin"
  | "notBangla"
  | "tooShort"
  | "tooLong"
  | "wordRange";

/** Which numeral system a paste should be repaired into before the run. */
export type CustomNumerals = "keep" | "bengali" | "ascii";

export const CUSTOM_NUMERALS: readonly CustomNumerals[] = ["keep", "bengali", "ascii"];

export function isCustomNumerals(value: unknown): value is CustomNumerals {
  return value === "keep" || value === "bengali" || value === "ascii";
}

export interface CustomTextCheck {
  /** The cleaned text, ready to practise once the numerals are decided. */
  text: string;
  /** Code points and words, as counted for the limits. */
  chars: number;
  words: number;
  /** How many ASCII and how many Bengali digits the paste carries. */
  asciiDigits: number;
  bengaliDigits: number;
  problems: CustomProblem[];
  /** True when there is no problem left. */
  ok: boolean;
}

/** The shape the single-paste key used, still read so nobody loses a paste. */
export interface StoredCustomText {
  text: string;
  savedAt: number;
}

/** One named paste in the library. */
export interface CustomLibraryItem {
  id: string;
  name: string;
  text: string;
  savedAt: number;
}

export interface CustomLibrary {
  /** Newest first. */
  items: CustomLibraryItem[];
  /** The item the learner last opened or practised, if any. */
  activeId: string | null;
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

const ASCII_DIGITS = "0123456789";
const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

/** How many digits of each numeral system the text carries. */
export function countDigits(text: string): { ascii: number; bengali: number } {
  let ascii = 0;
  let bengali = 0;
  for (const character of text) {
    if (ASCII_DIGITS.includes(character)) ascii += 1;
    else if (BENGALI_DIGITS.includes(character)) bengali += 1;
  }
  return { ascii, bengali };
}

/**
 * Convert a paste's numerals into one system, or leave them alone.
 *
 * This is the "repair" a learner needs: the target is what the app scores
 * against, so a passage whose numerals are not the ones their keyboard produces
 * cannot be typed correctly — no matter how careful they are. Converting both
 * ways means either keyboard works: `bengali` suits Avro's digit output and the
 * `numbers` funbox, `ascii` suits a layout that leaves the number row alone.
 * Every other character is untouched.
 */
export function repairDigits(text: string, numerals: CustomNumerals): string {
  if (numerals === "keep" || typeof text !== "string") return text;

  const from = numerals === "bengali" ? ASCII_DIGITS : BENGALI_DIGITS;
  const to = numerals === "bengali" ? BENGALI_DIGITS : ASCII_DIGITS;

  let output = "";
  for (const character of text) {
    const index = from.indexOf(character);
    output += index === -1 ? character : (to[index] ?? character);
  }
  return output;
}

/**
 * Validate a paste, and report every problem rather than only the first.
 *
 * Digits are set aside before the script check: a numeral is neither Bangla nor
 * Latin, and both systems are legal here (the repair step decides which one the
 * run will use). Everything else must be Bangla typography.
 */
export function checkCustomText(raw: string): CustomTextCheck {
  const text = cleanCustomText(raw);

  if (text.length === 0) {
    return {
      text,
      chars: 0,
      words: 0,
      asciiDigits: 0,
      bengaliDigits: 0,
      problems: ["empty"],
      ok: false,
    };
  }

  const problems: CustomProblem[] = [];
  const digits = countDigits(text);
  const withoutDigits = text.replace(/[0-9০-৯]/gu, "");

  // Latin letters get their own message: pasting English by mistake is the
  // common case, and "use Bangla text only" is clearer than "not Bangla".
  if (hasLatinLetters(withoutDigits)) problems.push("latin");
  else if (!isBanglaOnly(withoutDigits)) problems.push("notBangla");

  const chars = countCodePoints(text);
  const words = splitWords(text).length;

  if (chars < CUSTOM_MIN_CHARS) problems.push("tooShort");
  else if (chars > CUSTOM_MAX_CHARS) problems.push("tooLong");

  if (words < CUSTOM_MIN_WORDS || words > CUSTOM_MAX_WORDS) problems.push("wordRange");

  return {
    text,
    chars,
    words,
    asciiDigits: digits.ascii,
    bengaliDigits: digits.bengali,
    problems,
    ok: problems.length === 0,
  };
}

/** The timer choices the paste panel offers, in seconds. */
export const CUSTOM_DURATION_OPTIONS: readonly number[] = [15, 30, 60, 120];
/** The word-goal choices the paste panel offers. */
export const CUSTOM_WORD_OPTIONS: readonly number[] = [10, 25, 50, 100];

/** How one custom run is bounded: a timer, a word goal, or the whole passage. */
export interface CustomRunOptions {
  durationMs: number | null;
  wordGoal: number | null;
}

function positiveInt(value: number | null | undefined, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(max, Math.round(value));
}

/**
 * Turn the panel's two chips into run options.
 *
 * At most one limit can apply. A word goal wins when a hand-written link carries
 * both, which is the same rule the preset encoder and decoder use, so a pasted
 * passage bounded by words is never silently turned into a timed run (or the
 * other way round) on the way through a URL.
 */
export function customRunOptions(input: {
  durationSeconds?: number | null;
  wordGoal?: number | null;
}): CustomRunOptions {
  const goal = positiveInt(input.wordGoal, CUSTOM_MAX_WORDS);
  if (goal !== null) return { durationMs: null, wordGoal: goal };

  const seconds = positiveInt(input.durationSeconds, 3600);
  if (seconds !== null) return { durationMs: seconds * 1000, wordGoal: null };

  return { durationMs: null, wordGoal: null };
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

// ---------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------

/** How many words a stored text has, for the library list. */
export function countWords(text: string): number {
  return splitWords(cleanCustomText(text)).length;
}

export function emptyLibrary(): CustomLibrary {
  return { items: [], activeId: null };
}

/**
 * A name for a paste nobody has named: its first few words, which is how the
 * learner would recognise it in a list. Capped by code point so a Bangla word is
 * never cut in half, and never empty: an unnamed item falls back to its length.
 */
export function suggestName(text: string, words = 4): string {
  const first = splitWords(cleanCustomText(text)).slice(0, words).join(" ");
  const clipped = Array.from(first).slice(0, 32).join("");
  if (clipped.length > 0) return clipped;

  const chars = countCodePoints(cleanCustomText(text));
  return `${chars} ${chars === 1 ? "character" : "characters"}`;
}

/** Trim a user-supplied name down to a label, falling back when it is empty. */
export function normalizeName(name: unknown, fallback: string): string {
  if (typeof name !== "string") return fallback;
  const cleaned = name.replace(/\s+/gu, " ").trim();
  if (cleaned.length === 0) return fallback;
  return Array.from(cleaned).slice(0, CUSTOM_NAME_MAX).join("");
}

/** A stable id for an item: its save time plus a hash of its text. */
export function libraryItemId(text: string, now: number): string {
  let hash = 0x811c9dc5;
  for (const character of text) {
    hash ^= character.codePointAt(0) as number;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `custom-${now.toString(36)}-${hash.toString(36)}`;
}

export interface AddCustomItemInput {
  text: string;
  name?: string;
  savedAt?: number;
}

/**
 * Put a paste in the library, newest first.
 *
 * Returns null when the text does not validate or the library is full — and in
 * the full case only for a *new* text: re-saving a paste the learner already has
 * must always work, otherwise the twentieth item would become read-only. A paste
 * that is already in the library is renamed and refreshed in place instead of
 * being added twice, which is what makes "save" and "start" safe to both hit.
 */
export function addCustomItem(
  library: CustomLibrary,
  input: AddCustomItemInput,
): { library: CustomLibrary; item: CustomLibraryItem } | null {
  const check = checkCustomText(input.text);
  if (!check.ok) return null;

  const savedAt = input.savedAt ?? Date.now();
  const existing = library.items.find((item) => item.text === check.text);
  const name = normalizeName(input.name, suggestName(check.text));

  if (existing !== undefined) {
    const item: CustomLibraryItem = { ...existing, name, savedAt };
    return {
      library: {
        items: [item, ...library.items.filter((other) => other.id !== existing.id)],
        activeId: existing.id,
      },
      item,
    };
  }

  if (library.items.length >= CUSTOM_LIBRARY_MAX) return null;

  const item: CustomLibraryItem = {
    id: libraryItemId(check.text, savedAt),
    name,
    text: check.text,
    savedAt,
  };
  return { library: { items: [item, ...library.items], activeId: item.id }, item };
}

export function renameCustomItem(
  library: CustomLibrary,
  id: string,
  name: string,
): CustomLibrary {
  const items = library.items.map((item) =>
    item.id === id ? { ...item, name: normalizeName(name, item.name) } : item,
  );
  return { ...library, items };
}

export function removeCustomItem(library: CustomLibrary, id: string): CustomLibrary {
  const items = library.items.filter((item) => item.id !== id);
  const activeId = library.activeId === id ? (items[0]?.id ?? null) : library.activeId;
  return { items, activeId };
}

/** Mark one item as the one in use, or clear the mark with null. */
export function selectCustomItem(library: CustomLibrary, id: string | null): CustomLibrary {
  const known = id !== null && library.items.some((item) => item.id === id);
  return { ...library, activeId: known ? id : null };
}

export function activeCustomItem(library: CustomLibrary): CustomLibraryItem | null {
  return library.items.find((item) => item.id === library.activeId) ?? null;
}

function parseLibraryItem(raw: unknown): CustomLibraryItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Partial<CustomLibraryItem>;

  if (typeof value.text !== "string") return null;
  const check = checkCustomText(value.text);
  if (!check.ok) return null;

  const savedAt =
    typeof value.savedAt === "number" && Number.isFinite(value.savedAt) ? value.savedAt : 0;
  const id =
    typeof value.id === "string" && value.id.length > 0
      ? value.id
      : libraryItemId(check.text, savedAt);

  return {
    id,
    name: normalizeName(value.name, suggestName(check.text)),
    text: check.text,
    savedAt,
  };
}

/**
 * Validate a stored library. A duplicate id, an item that no longer validates or
 * a list longer than the cap is dropped rather than repaired quietly, and the
 * active mark is kept only if it still points at something.
 */
export function parseCustomLibrary(raw: unknown): CustomLibrary | null {
  if (typeof raw !== "object" || raw === null) return null;
  if (!Array.isArray((raw as Partial<CustomLibrary>).items)) return null;

  const items: CustomLibraryItem[] = [];
  const seen = new Set<string>();

  for (const entry of (raw as { items: unknown[] }).items) {
    if (items.length >= CUSTOM_LIBRARY_MAX) break;
    const item = parseLibraryItem(entry);
    if (item === null || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }

  const active = (raw as Partial<CustomLibrary>).activeId;
  const activeId = typeof active === "string" && seen.has(active) ? active : (items[0]?.id ?? null);

  return { items, activeId };
}

/** A one-item library holding this text, for the old single-paste shape. */
export function libraryWithText(text: string, savedAt: number = Date.now()): CustomLibrary | null {
  return addCustomItem(emptyLibrary(), { text, savedAt })?.library ?? null;
}

export function saveCustomLibrary(
  library: CustomLibrary,
  storage: StorageAdapter = availableStorage(),
): boolean {
  return writeJson(CUSTOM_LIBRARY_KEY, library, storage);
}

/**
 * Read the library, migrating the old single-paste key the first time.
 *
 * The migration writes the new key immediately, so it happens once and the old
 * entry can be forgotten; a paste the learner saved before this version is still
 * in their list afterwards.
 */
export function loadCustomLibrary(storage: StorageAdapter = availableStorage()): CustomLibrary {
  const stored = readJson(CUSTOM_LIBRARY_KEY, parseCustomLibrary, storage);
  if (stored !== null) return stored;

  const legacy = readJson(CUSTOM_TEXT_KEY, parseStoredCustomText, storage);
  if (legacy === null) return emptyLibrary();

  const migrated = libraryWithText(legacy.text, legacy.savedAt) ?? emptyLibrary();
  saveCustomLibrary(migrated, storage);
  removeKey(CUSTOM_TEXT_KEY, storage);
  return migrated;
}

export function clearCustomLibrary(storage: StorageAdapter = availableStorage()): void {
  removeKey(CUSTOM_LIBRARY_KEY, storage);
  removeKey(CUSTOM_TEXT_KEY, storage);
}

// ---------------------------------------------------------------------------
// The old single-paste helpers, kept for the preset and backup paths
// ---------------------------------------------------------------------------

/** Read a stored single paste, dropping anything that no longer validates. */
export function parseStoredCustomText(raw: unknown): StoredCustomText | null {
  if (typeof raw !== "object" || raw === null) return null;

  const value = raw as Partial<StoredCustomText>;
  if (typeof value.text !== "string") return null;

  const check = checkCustomText(value.text);
  if (!check.ok) return null;

  return {
    text: check.text,
    savedAt:
      typeof value.savedAt === "number" && Number.isFinite(value.savedAt) ? value.savedAt : 0,
  };
}

/** The most recently saved text in the library, in the old shape. */
export function loadCustomText(
  storage: StorageAdapter = availableStorage(),
): StoredCustomText | null {
  const item = loadCustomLibrary(storage).items[0];
  return item === undefined ? null : { text: item.text, savedAt: item.savedAt };
}

/**
 * Store a paste without naming it, returning the stored value — or null when the
 * text is invalid or storage refused the write, so the caller can tell the user
 * their text will not survive a reload instead of failing silently.
 */
export function saveCustomText(
  raw: string,
  savedAt: number = Date.now(),
  storage: StorageAdapter = availableStorage(),
): StoredCustomText | null {
  const library = loadCustomLibrary(storage);
  const added = addCustomItem(library, { text: raw, savedAt });
  if (added === null) return null;

  return saveCustomLibrary(added.library, storage)
    ? { text: added.item.text, savedAt: added.item.savedAt }
    : null;
}

/** Forget every stored paste. */
export function clearCustomText(storage: StorageAdapter = availableStorage()): void {
  clearCustomLibrary(storage);
}
