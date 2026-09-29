/**
 * The infinite word bank. Monkeytype's core trick: the target is not a fixed
 * text but a stream — words keep coming as you type, and no run is ever the
 * same. This bank streams the whole curated vocabulary (all practice texts plus
 * the lesson drills) with a common-word weighting so the flow feels natural,
 * and avoids repeating a word within the recent window.
 */

import { createRng, type Rng } from "./text/provider";
import { splitWords } from "./unicode";

/** Words drawn from one RNG seed; split once, reused. */
export interface WordBank {
  readonly words: readonly string[];
  readonly weights: readonly number[];
}

/** Build the bank from every text source the app ships. */
export function createWordBank(texts: readonly string[]): WordBank {
  const counts = new Map<string, number>();

  for (const text of texts) {
    for (const word of splitWords(text)) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  const words = [...counts.keys()];
  const weights = [...counts.values()];
  return { words, weights };
}

/** Weighted pick without replacement-ish: avoids the recent window. */
function weightedIndex(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * total;

  for (let index = 0; index < weights.length; index += 1) {
    roll -= weights[index];
    if (roll < 0) return index;
  }

  return weights.length - 1;
}

/**
 * Draw the next chunk of words. Deterministic for a given seed, so the first
 * screen is identical before and after hydration.
 */
export function drawWords(
  bank: WordBank,
  count: number,
  seed: number,
  recent: readonly string[] = [],
): string[] {
  const rng = createRng(seed);
  const recentSet = new Set(recent.slice(-40));
  const drawn: string[] = [];

  let guard = 0;
  while (drawn.length < count && guard < count * 30) {
    guard += 1;
    const index = weightedIndex(bank.weights, rng);
    const word = bank.words[index];
    if (word === undefined) continue;
    if (recentSet.has(word) && guard < count * 6) continue;
    // Never twice in a row: the flow must feel like language, not a chant.
    if (word === drawn[drawn.length - 1]) continue;
    recentSet.add(word);
    drawn.push(word);
  }

  // A tiny bank could starve; fall back to cycling what exists.
  while (drawn.length < count && bank.words.length > 0) {
    const word = bank.words[drawn.length % bank.words.length];
    if (word === undefined) break;
    drawn.push(word);
  }

  return drawn;
}
