/**
 * The on-screen hint for built-in phonetic mode.
 *
 * In this mode the learner presses Roman keys and the engine converts them, so
 * the useful hint is which key to press next. The tempting way to compute it is to
 * ask which letters keep the engine's *rendered* output compatible with the target
 * — and that is wrong, because a half-typed word does not render as a prefix of
 * the finished one. `ng` is one rule (two keys) for ং, `S` produces শ where `s`
 * produces স, and `kem` renders as কেমো on the way to কেমন. Measured over the
 * words the app teaches, that approach gave a wrong or missing suggestion for
 * **134 of 249 words**.
 *
 * So the hint does not guess from the engine's output. It walks a *spelling* that
 * produces the target word — the word list's own keys for that word first, then
 * the rules' inverse of it — and offers the next character of whichever of those
 * spellings the learner is already on. Every suggestion is therefore a key that
 * keeps the word reachable, and it carries what the scheme actually needs: the
 * shift state (ট is `T`, not `t`) and the punctuation keys (`^` for the
 * candrabindu, `` ` `` for a hasanta, `.` for the danda).
 *
 * The physical key for a character is a US-layout assumption, which is the layout
 * the Roman scheme is written for; it is the same assumption the rest of the app
 * makes when it talks about `T` and `S`.
 */

import {
  compileRules,
  loadGrammar,
  transliterate,
  type CompiledRule,
  type PhoneticGrammar,
  type TransliterateOptions,
} from "./phonetic";
import { compileInverse, invertWord, type InverseTable } from "./phoneticDictionary";

export interface RomanKeypress {
  /** The `KeyboardEvent.code` a physical keyboard reports for the key. */
  code: string;
  /** Whether Shift has to be held with it. */
  shift: boolean;
}

/** The non-letter characters the scheme types, and the keys that produce them. */
const PUNCTUATION_KEYS: Record<string, RomanKeypress> = {
  "`": { code: "Backquote", shift: false },
  "^": { code: "Digit6", shift: true },
  ":": { code: "Semicolon", shift: true },
  ";": { code: "Semicolon", shift: false },
  ".": { code: "Period", shift: false },
  ",": { code: "Comma", shift: false },
  "?": { code: "Slash", shift: true },
  "!": { code: "Digit1", shift: true },
  "-": { code: "Minus", shift: false },
};

/**
 * The key that types one character of a Roman spelling, or null when a Roman
 * keyboard cannot produce it at all.
 */
export function keypressFor(character: string): RomanKeypress | null {
  if (/^[a-z]$/.test(character)) return { code: `Key${character.toUpperCase()}`, shift: false };
  if (/^[A-Z]$/.test(character)) return { code: `Key${character}`, shift: true };
  if (/^[0-9]$/.test(character)) return { code: `Digit${character}`, shift: false };
  return PUNCTUATION_KEYS[character] ?? null;
}

/** The character a keypress produces, for the tests and the walk in them. */
export function characterFor(key: RomanKeypress): string | null {
  const named = Object.entries(PUNCTUATION_KEYS).find(
    ([, value]) => value.code === key.code && value.shift === key.shift,
  );
  if (named !== undefined) return named[0];

  const letter = /^Key([A-Z])$/.exec(key.code);
  if (letter !== null) return key.shift ? letter[1] : letter[1].toLowerCase();
  const digit = /^Digit(\d)$/.exec(key.code);
  if (digit !== null) return key.shift ? `!` : digit[1];
  return null;
}

/** Is this character inside the Bengali block, or a joiner between two of them? */
function isBengali(character: string): boolean {
  const point = character.codePointAt(0) ?? 0;
  return point === 0x200c || point === 0x200d || (point >= 0x0980 && point <= 0x09ff);
}

/**
 * A target token split into the word and whatever trails it.
 *
 * A token can be a word carrying its sentence punctuation (`কথা।`), and the
 * punctuation is typed too — with the scheme's own key, so the danda is `.`. The
 * hint walks the word and then those keys.
 */
export function splitTarget(token: string): { word: string; trailing: string } {
  let end = 0;
  while (end < token.length && isBengali(token[end] as string)) end += 1;
  return { word: token.slice(0, end), trailing: token.slice(end) };
}

/** The keys that type a run of trailing characters, in order. */
function typedTail(trailing: string, grammar: PhoneticGrammar): string {
  let out = "";
  for (const character of trailing) {
    const row = grammar.punctuation.find((candidate) => candidate.bangla === character);
    out += row?.latin ?? character;
  }
  return out;
}

/** Compiled rules and inverse tables, per grammar object: the hint runs per key. */
const compiledByGrammar = new WeakMap<PhoneticGrammar, CompiledRule[]>();
const inverseByGrammar = new WeakMap<PhoneticGrammar, InverseTable>();

function compiledFor(grammar: PhoneticGrammar): CompiledRule[] {
  const cached = compiledByGrammar.get(grammar);
  if (cached !== undefined) return cached;
  const compiled = compileRules(grammar);
  compiledByGrammar.set(grammar, compiled);
  return compiled;
}

function inverseFor(grammar: PhoneticGrammar): InverseTable {
  const cached = inverseByGrammar.get(grammar);
  if (cached !== undefined) return cached;
  const table = compileInverse(grammar);
  inverseByGrammar.set(grammar, table);
  return table;
}

/**
 * Every Roman spelling known to produce `word`, shortest first.
 *
 * Two sources, because neither alone is complete: the word list holds the
 * spellings that exist *because* the rules get them wrong (`Da^Talo`), and the
 * rules' own inverse holds the spellings for every other word. A candidate from
 * either source is kept only if the engine really does produce `word` from it,
 * which is what lets the hint promise a suggestion instead of hoping.
 */
export function spellingsFor(word: string, options: TransliterateOptions = {}): string[] {
  if (word === "") return [];
  const grammar = options.grammar ?? loadGrammar();
  const known = new Set<string>();

  for (const spelling of options.dictionary?.spellings(word) ?? []) {
    if (transliterate(spelling, { ...options, grammar }) === word) known.add(spelling);
  }
  // The rules' own inverse, and the relaxed o-kar a learner is likely to write.
  // Deliberately `invertWord` and not `romanKeys`: that one drops the spellings the
  // engine could not look up as a *word list key* (a word ending in ৎ is typed
  // `…t`` `), and the hint is about keystrokes, not about keys.
  const canonical = invertWord(word, inverseFor(grammar));
  if (canonical !== null) {
    for (const spelling of [canonical, canonical.replace(/O/g, "o")]) {
      if (transliterate(spelling, { ...options, grammar, compiled: compiledFor(grammar) }) === word) {
        known.add(spelling);
      }
    }
  }

  return [...known].sort((a, b) => a.length - b.length || (a < b ? -1 : 1));
}

/** The plans that reach a target token: a spelling, then its punctuation keys. */
function plansFor(targetToken: string, options: TransliterateOptions): string[] {
  const grammar = options.grammar ?? loadGrammar();
  const { word, trailing } = splitTarget(targetToken);
  if (word === "") return [];

  const tail = typedTail(trailing, grammar);
  return spellingsFor(word, options).map((spelling) => spelling + tail);
}

/**
 * The key that commits a finished word. A word ends when the learner presses
 * space (or Enter), and the on-screen board lights that key up rather than going
 * quiet: "the word is right, now finish it" is the last thing the hint has to
 * say on every single word, and it is exactly where a beginner stalls.
 */
const COMMIT_KEY: RomanKeypress = { code: "Space", shift: false };

/**
 * The keys to press next.
 *
 * A finished token is answered with the commit key, because at that point the
 * next keystroke is what turns the composing word into a committed one.
 *
 * Empty when there is nothing honest to say: the target is empty, or the
 * learner's buffer is not on the way to any spelling of the target (a wrong turn
 * is the session's business to point out, not the hint's to paper over).
 */
export function nextRomanKeys(
  buffer: string,
  targetToken: string,
  options: TransliterateOptions = {},
): RomanKeypress[] {
  if (targetToken === "") return [];
  if (transliterate(buffer, options) === targetToken) return [COMMIT_KEY];

  const plans = plansFor(targetToken, options).filter((plan) => plan.startsWith(buffer));
  if (plans.length === 0) return [];

  const keys: RomanKeypress[] = [];
  const seen = new Set<string>();
  for (const plan of plans) {
    if (plan.length <= buffer.length) continue;
    const key = keypressFor(plan[buffer.length] as string);
    if (key === null) continue;
    const id = `${key.code}:${String(key.shift)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    keys.push(key);
  }

  return keys;
}

/** The key codes to highlight, in the order the suggestions have them. */
export function romanKeyHint(
  buffer: string,
  targetToken: string,
  options: TransliterateOptions = {},
): string[] {
  return nextRomanKeys(buffer, targetToken, options).map((key) => key.code);
}
