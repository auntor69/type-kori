/**
 * A real Bangla word list, made usable by the phonetic engine.
 *
 * The engine's grammar is a *speller*: given Roman keystrokes it produces the
 * Bangla a rule table can decide. What it cannot decide is whether the result is
 * a word the language actually uses, and where two spellings share one Roman
 * form it has nothing to choose between them. Real Avro Phonetic ships a large
 * word list for exactly that, so this module gives this project one too.
 *
 * Everything here is derived from the grammar, not from a second keymap:
 *
 * - `invertWord` runs the scanner backwards. A consonant that takes the inherent
 *   vowel gets it spelled out (`কেমন` → `kemon`), so the inverse of a word is a
 *   Roman string a learner could actually type for it.
 * - `isTypeable` proves the round trip: the word is only accepted when the
 *   engine's own forward conversion reproduces it exactly. A word the grammar
 *   cannot spell is no use to a trainer and is dropped at build time.
 * - `romanKeys` are the spellings accepted for a word. The canonical one, plus
 *   the relaxed form of a word-final o-kar, because a learner writing plain `o`
 *   for `ো` is the single commonest spelling they will get wrong.
 *
 * The module is deliberately free of I/O: it is pure logic over a grammar, so
 * the build script and the runtime share one implementation and the tests can
 * hold it still.
 */

import { HASANTA, normalizeText, ZWJ, ZWNJ } from "../unicode";
import {
  loadGrammar,
  splitTrailingPunctuation,
  transliterate,
  type PhoneticGrammar,
} from "./phonetic";

/** A Roman spelling and the Bangla words it produces. */
export interface DictionaryEntry {
  roman: string;
  words: string[];
}

/**
 * The word list as the engine sees it: the spellings whose rules output is not a
 * word, and what to use instead.
 *
 * Only corrections are in here. A spelling whose rules output is already a real
 * word is deliberately absent: preferring the list's other spelling would be a
 * guess, and a word list is not a frequency table. The build script proves which
 * is which (see `scripts/build-dictionary.ts`), so the runtime never has to.
 */
export interface WordDictionary {
  /** The word this Roman form should produce instead. Empty when there is none. */
  candidates(roman: string): string[];
  /**
   * The spellings the list holds for a word: the other direction, for the hint.
   *
   * The on-screen hint has to follow a spelling that reaches the target word, and
   * for a word the rules get wrong that spelling exists only here — so the hint
   * needs the lookup the engine never does.
   */
  spellings(word: string): string[];
  /** How many spellings the list holds, for the docs and the tests. */
  readonly size: number;
}

/** Nothing known: the engine behaves exactly as it does with no word list. */
export const EMPTY_DICTIONARY: WordDictionary = {
  candidates: () => [],
  spellings: () => [],
  size: 0,
};

type UnitKind = "letter" | "sign" | "independent" | "mark" | "hasanta" | "digit";

interface InverseUnit {
  bangla: string;
  latin: string;
  kind: UnitKind;
}

export interface InverseTable {
  /** Longest Bangla first, so `ক্ষ` wins over `ক`. */
  units: InverseUnit[];
  /** The Roman letter that means "the inherent vowel is not written": `o`. */
  inherent: string;
}

/**
 * The Bangla a word may be built from: the Bengali block without the digits,
 * the currency sign and the abbreviation marks, plus the two joiners. A word
 * containing anything else is not in the grammar's reach and is dropped.
 */
const ALLOWED = /^[\u0980-\u09E5\u200c\u200d]+$/;

/** True when every character of `word` is one the grammar can spell. */
export function isSpellableAlphabet(word: string): boolean {
  return ALLOWED.test(word);
}

/** Build the reverse lookup the inversion scans with. */
export function compileInverse(grammar: PhoneticGrammar = loadGrammar()): InverseTable {
  const units: InverseUnit[] = [];

  for (const row of grammar.vowels) {
    units.push({ bangla: row.independent, latin: row.latin, kind: "independent" });
    // `অ` and the inherent vowel share an empty sign; only a real sign is a unit.
    if (row.sign !== "") units.push({ bangla: row.sign, latin: row.latin, kind: "sign" });
  }
  for (const row of grammar.consonants) {
    units.push({ bangla: row.bangla, latin: row.latin, kind: "letter" });
  }
  for (const row of grammar.conjuncts) {
    units.push({ bangla: row.bangla, latin: row.latin, kind: "letter" });
  }
  for (const row of grammar.marks) {
    units.push({
      bangla: row.bangla,
      latin: row.latin,
      kind: row.bangla === HASANTA ? "hasanta" : "mark",
    });
  }
  // Digits are spelled like marks — one key, no context — so a numeral in the
  // shipped texts is typeable and can be hinted like any other character.
  for (const row of grammar.digits) {
    units.push({ bangla: row.bangla, latin: row.latin, kind: "digit" });
  }

  // A Bangla form claimed by two rows keeps its shortest Latin spelling: `শ` is
  // `sh` before it is `S`, and the forward scanner agrees because it tries the
  // longest key first on the Roman side.
  const byBangla = new Map<string, InverseUnit>();
  for (const unit of units) {
    const found = byBangla.get(unit.bangla);
    if (found === undefined || unit.latin.length < found.latin.length) {
      byBangla.set(unit.bangla, unit);
    }
  }

  const sorted = [...byBangla.values()].sort((a, b) => b.bangla.length - a.bangla.length);
  const inherentRow = grammar.vowels.find((row) => row.sign === "");

  return {
    units: sorted,
    inherent: inherentRow?.latin ?? "o",
  };
}

/**
 * The Roman keystrokes the engine accepts for one Bangla word, or null when the
 * grammar cannot spell it at all.
 *
 * The two decisions here mirror the forward scanner exactly:
 *
 * - a consonant takes the inherent vowel unless a sign, a hasanta or a joiner
 *   follows it, or the word ends there, which is what makes `কেমন` come out as
 *   `kemon`;
 * - a hasanta is left out only where the scanner would insert one itself, which
 *   is between two consonant letters. Anywhere else it has to be written, or the
 *   word cannot be typed at all — that is what `অ্যা` needs, and why `oza` alone
 *   will not do.
 */
export function invertWord(word: string, table: InverseTable): string | null {
  const characters = Array.from(word);
  let output = "";
  let previous: UnitKind | null = null;
  let index = 0;

  const unitAt = (at: number): InverseUnit | undefined =>
    table.units.find((candidate) => word.startsWith(candidate.bangla, at));

  while (index < characters.length) {
    const unit = unitAt(index);
    if (unit === undefined) return null;

    if (unit.kind === "letter") {
      output += unit.latin;
      const next = characters[index + unit.bangla.length];
      const suppressed =
        next === HASANTA || next === ZWJ || next === ZWNJ || isVowelSign(next, table);
      // Nothing follows a word-final consonant, so its inherent vowel is left
      // unwritten rather than spelled out: `কেমন` inverts to `kemon`, which is what
      // a typist actually presses, and the rules read it back identically.
      if (!suppressed && next !== undefined) output += table.inherent;
    } else if (unit.kind === "hasanta") {
      const next = unitAt(index + unit.bangla.length);
      const scannerInsertsIt = previous === "letter" && next?.kind === "letter";
      if (!scannerInsertsIt) output += unit.latin;
    } else {
      output += unit.latin;
    }

    previous = unit.kind;
    index += unit.bangla.length;
  }

  return output;
}

function isVowelSign(character: string | undefined, table: InverseTable): boolean {
  if (character === undefined) return false;
  return table.units.some((unit) => unit.kind === "sign" && unit.bangla === character);
}

/**
 * The spellings accepted for a word: the canonical one, plus the o-kar a learner
 * is likely to write as a plain `o`.
 *
 * `ভালো` inverts to `bhalO` because its final vowel is a sign, and a typist who
 * has learned that `o` is the inherent vowel will write `bhalo`. Offering both is
 * what lets the list recognise the word they meant.
 *
 * A spelling the engine would read as "the word plus punctuation" is left out.
 * The engine splits a typed buffer at its trailing punctuation before it looks
 * anything up, so a key ending in a mark could never be found, and a word that
 * ends in one is not worth guessing at (nothing in the shipped content does).
 */
export function romanKeys(word: string, table: InverseTable): string[] {
  const canonical = invertWord(word, table);
  if (canonical === null) return [];

  const keys = [canonical];
  const relaxed = canonical.replace(/O/g, "o");
  if (relaxed !== canonical) keys.push(relaxed);

  return keys.filter((key) => splitTrailingPunctuation(key)[0] === key);
}

/**
 * Would the engine, following the rules alone, produce this word from its own
 * inverse? Only then is the word worth keeping: a word the grammar cannot spell
 * can never be typed in built-in mode, so listing it would promise something the
 * engine cannot deliver.
 */
export function isTypeable(
  word: string,
  table: InverseTable,
  grammar: PhoneticGrammar,
): boolean {
  const roman = invertWord(word, table);
  if (roman === null) return false;
  return rulesOnly(roman, grammar) === word;
}

/** The grammar's conversion with the curated word list taken out of the way. */
export function rulesOnly(roman: string, grammar: PhoneticGrammar): string {
  return transliterate(roman, { grammar: { ...grammar, dictionary: [] } });
}

export interface BuildResult {
  entries: DictionaryEntry[];
  /** Words kept, in the order they were built. */
  words: string[];
  stats: {
    input: number;
    rejectedAlphabet: number;
    rejectedUntypeable: number;
    kept: number;
  };
}

/**
 * Turn a word list into the engine's index.
 *
 * Two spellings for one word collapse to one entry, and two words behind one
 * spelling share an entry — that collision is the whole point of the list, since
 * it is the only place the engine can see that a Roman form is ambiguous.
 */
export function buildDictionary(
  words: Iterable<string>,
  grammar: PhoneticGrammar = loadGrammar(),
): BuildResult {
  const table = compileInverse(grammar);
  const seen = new Set<string>();
  const byRoman = new Map<string, string[]>();
  // The word a spelling is the *canonical* inverse of, when there is one. It has
  // to come first in its entry: the engine answers a complete Roman word with the
  // first candidate, so putting the owner first is what guarantees the word can
  // still be typed as itself.
  const owners = new Map<string, string>();
  const kept: string[] = [];
  let rejectedAlphabet = 0;
  let rejectedUntypeable = 0;
  let input = 0;

  for (const raw of words) {
    const word = normalizeText(raw.trim());
    if (word === "") continue;
    input += 1;
    if (seen.has(word)) continue;
    seen.add(word);

    if (!isSpellableAlphabet(word)) {
      rejectedAlphabet += 1;
      continue;
    }
    if (!isTypeable(word, table, grammar)) {
      rejectedUntypeable += 1;
      continue;
    }

    kept.push(word);
    const keys = romanKeys(word, table);
    for (const roman of keys) {
      // Two different words cannot share a canonical spelling: a canonical
      // spelling converts back to the word it came from, and conversion is a
      // function. The relaxed spelling of one word can only collide with the
      // canonical spelling of a word that has the same letters with no o-kar.
      if (roman === keys[0]) owners.set(roman, word);
      const bucket = byRoman.get(roman);
      if (bucket === undefined) byRoman.set(roman, [word]);
      else if (!bucket.includes(word)) bucket.push(word);
    }
  }

  const entries = [...byRoman.entries()]
    .map(([roman, list]) => ({ roman, words: orderCandidates(roman, list.sort(compareWords), owners) }))
    .sort((a, b) => (a.roman < b.roman ? -1 : a.roman > b.roman ? 1 : 0));

  return {
    entries,
    words: kept,
    stats: {
      input,
      rejectedAlphabet,
      rejectedUntypeable,
      kept: kept.length,
    },
  };
}

/**
 * The order words are offered in for one spelling: the word the spelling inverts
 * to first, then the shortest, then code-point order.
 *
 * The first candidate is the one the engine answers with, so this order decides
 * what a learner gets when a spelling is ambiguous. The owner goes first because
 * it is the answer that cannot be argued with — the rules would have produced
 * that word anyway, so the list is not overriding anything to say it. The rest is
 * mechanical and says so: the list carries no word frequency, which is the one
 * thing a freely licensed Bangla word list does not include.
 */
function orderCandidates(
  roman: string,
  words: string[],
  owners: ReadonlyMap<string, string>,
): string[] {
  const owner = owners.get(roman);
  if (owner === undefined) return words;

  const at = words.indexOf(owner);
  if (at <= 0) return words;
  words.splice(at, 1);
  words.unshift(owner);
  return words;
}

/**
 * Which of two words behind one spelling comes first once the owner has been
 * placed: the shorter spelling, then code-point order, so the choice is at least
 * stable and reviewable.
 */
function compareWords(a: string, b: string): number {
  const length = Array.from(a).length - Array.from(b).length;
  if (length !== 0) return length;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The asset's on-disk shape: one line per spelling, words separated by spaces. */
export function serializeDictionary(entries: DictionaryEntry[]): string {
  return `${entries
    .map((entry) => [entry.roman, ...entry.words].join(" "))
    .join("\n")}\n`;
}

/** Read the asset back. A malformed line is dropped rather than thrown over. */
export function parseDictionary(text: string): DictionaryEntry[] {
  const entries: DictionaryEntry[] = [];

  for (const line of text.split("\n")) {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    const [roman, ...words] = parts;
    if (roman === undefined || words.length === 0) continue;
    entries.push({ roman, words });
  }

  return entries;
}

/**
 * Wrap parsed entries as the runtime dictionary. A missing spelling is the
 * ordinary answer: most keystrokes need no correction at all.
 */
export function createWordDictionary(entries: DictionaryEntry[]): WordDictionary {
  const byRoman = new Map<string, string[]>();
  const byWord = new Map<string, string[]>();

  for (const entry of entries) {
    byRoman.set(entry.roman, entry.words);
    for (const word of entry.words) {
      const keys = byWord.get(word);
      if (keys === undefined) byWord.set(word, [entry.roman]);
      else if (!keys.includes(entry.roman)) keys.push(entry.roman);
    }
  }

  return {
    candidates: (roman) => byRoman.get(roman) ?? [],
    spellings: (word) => byWord.get(word) ?? [],
    size: byRoman.size,
  };
}
