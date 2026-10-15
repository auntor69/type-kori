/**
 * The on-screen hint for built-in phonetic mode.
 *
 * In this mode the learner presses Roman keys and the engine converts them, so
 * the useful hint is which Roman letters can still lead to the target word. It
 * is derived from the engine itself rather than from a hand-written keymap: a
 * candidate letter is offered only when the engine's own output for `buffer +
 * letter` is still compatible with the target, so the hint can never disagree
 * with what the engine will actually produce.
 *
 * Compatibility is checked cluster-wise with the *last* cluster allowed to be a
 * partial one, because the engine's output for a half-typed word is provisional
 * (`k` is ক, then `ke` is কে, then `kem` is কেম).
 */

import { loadGrammar, transliterate, type TransliterateOptions } from "./phonetic";
import { splitClusters } from "../unicode";

/** The letters a hint may suggest: the printable Latin keys Avro reads. */
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

/**
 * Is the engine's provisional output still on the way to the target word?
 *
 * Every complete cluster before the last must match the target exactly; the last
 * may be a code-point prefix of its target cluster, which is the half-typed
 * state. Output that is longer than the target, or that diverges, is not
 * compatible.
 */
export function isCompatiblePrefix(partial: string, target: string): boolean {
  const produced = splitClusters(partial);
  const wanted = splitClusters(target);

  if (produced.length === 0 || produced.length > wanted.length) return false;

  for (let index = 0; index < produced.length - 1; index += 1) {
    if (produced[index] !== wanted[index]) return false;
  }

  const last = produced[produced.length - 1] ?? "";
  const targetCluster = wanted[produced.length - 1] ?? "";
  return targetCluster.startsWith(last);
}

/**
 * The Roman letters that keep the word being typed on track for `targetWord`.
 * Empty when nothing can be suggested — the hint is silent rather than wrong.
 */
export function nextRomanLetters(
  buffer: string,
  targetWord: string,
  options: TransliterateOptions = {},
): string[] {
  const grammar = options.grammar ?? loadGrammar();

  return ALPHABET.filter((letter) => {
    const roman = buffer + letter;
    if (isCompatiblePrefix(transliterate(roman, options), targetWord)) return true;

    // A dictionary word can resolve a spelling the rules get wrong (kemon →
    // কেমন). Following such a spelling is still on the way to the target, so a
    // prefix of one is a valid next letter even while the rules alone disagree.
    const key = roman.toLowerCase();
    return grammar.dictionary.some(
      (row) => row.latin.toLowerCase().startsWith(key) && row.bangla === targetWord,
    );
  });
}

/** Map a Latin letter to its `KeyboardEvent.code`. */
export function letterCode(letter: string): string | null {
  if (letter.length !== 1 || letter < "a" || letter > "z") return null;
  return `Key${letter.toUpperCase()}`;
}

/** The key codes to highlight, in the order the suggestion list has them. */
export function romanKeyHint(
  buffer: string,
  targetWord: string,
  options: TransliterateOptions = {},
): string[] {
  return nextRomanLetters(buffer, targetWord, options)
    .map(letterCode)
    .filter((code): code is string => code !== null);
}
