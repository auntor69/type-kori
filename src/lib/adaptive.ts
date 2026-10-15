/**
 * The adaptive drill: a practice session built from what this browser has
 * actually got wrong.
 *
 * Three sources, in priority order:
 *
 * 1. the words you missed, worst first (the mistake notebook);
 * 2. real vocabulary words that carry the clusters you miss most;
 * 3. fresh vocabulary, so the drill never becomes a chant of the same six words.
 *
 * It is a pure function of stored data and the vocabulary, so the mix can be
 * unit tested without a browser. Nothing new is authored: the drill reuses words
 * the learner has already met.
 */

import type { PracticeText } from "../engine/text/provider";
import { splitClusters } from "../engine/unicode";
import { mistakeWords, spread } from "./mistakes";
import type { ErrorMap, RunRecord } from "./progress";
import { topWeakKeys } from "./weakKeys";

/** How many distinct words the plan weighs. The final drill is longer, because
 *  a word missed often is repeated. */
export const ADAPTIVE_ENTRY_LIMIT = 24;

/** How many carrier words one weak cluster contributes. */
const CARRIERS_PER_CLUSTER = 3;

export interface AdaptivePlan {
  /** The drill, in order, repeats included. */
  words: string[];
  /** Distinct words that came from each source. */
  review: number;
  cluster: number;
  fresh: number;
}

/**
 * Weigh and order the drill. Deterministic for a given seed and inputs, so the
 * same mistake history produces the same session and the effect can be tested.
 */
export function adaptivePlan(
  errorMap: Readonly<ErrorMap>,
  runs: readonly RunRecord[],
  vocabulary: readonly string[],
  options: { entryLimit?: number; seed?: number } = {},
): AdaptivePlan {
  const entryLimit = options.entryLimit ?? ADAPTIVE_ENTRY_LIMIT;
  const seed = options.seed ?? 1;

  const weighted: { word: string; remaining: number }[] = [];
  const seen = new Set<string>();

  const add = (word: string, weight: number) => {
    if (word.length === 0 || seen.has(word) || weighted.length >= entryLimit) return;
    seen.add(word);
    weighted.push({ word, remaining: Math.max(1, Math.round(weight)) });
  };

  // 1. The words you missed, heaviest first.
  let review = 0;
  for (const entry of mistakeWords(runs, 10)) {
    if (weighted.length >= entryLimit) break;
    add(entry.word, 2 + entry.count);
    review += 1;
  }

  // 2. Real words that carry your weakest clusters.
  let cluster = 0;
  for (const key of topWeakKeys(errorMap, 5)) {
    let taken = 0;
    for (const word of vocabulary) {
      if (taken >= CARRIERS_PER_CLUSTER || weighted.length >= entryLimit) break;
      if (seen.has(word)) continue;
      if (!splitClusters(word).includes(key.cluster)) continue;
      add(word, 1);
      taken += 1;
      cluster += 1;
    }
  }

  // 3. Fresh vocabulary, walked deterministically from the seed.
  let fresh = 0;
  if (vocabulary.length > 0) {
    const start = Math.abs(Math.trunc(seed)) % vocabulary.length;
    for (let index = 0; index < vocabulary.length && weighted.length < entryLimit; index += 1) {
      const word = vocabulary[(start + index) % vocabulary.length] ?? "";
      if (seen.has(word)) continue;
      add(word, 1);
      fresh += 1;
    }
  }

  return { words: spread(weighted), review, cluster, fresh };
}

/**
 * The adaptive drill as a practice text, or null when there is nothing to build
 * from (no history, no vocabulary).
 */
export function buildAdaptiveText(
  errorMap: Readonly<ErrorMap>,
  runs: readonly RunRecord[],
  vocabulary: readonly string[],
  options: { entryLimit?: number; seed?: number } = {},
): PracticeText | null {
  const plan = adaptivePlan(errorMap, runs, vocabulary, options);
  if (plan.words.length === 0) return null;

  return {
    id: "adaptive",
    text: plan.words.join(" "),
    difficulty: "hard",
    topic: "adaptive",
    source: "original",
    reviewed: true,
  };
}
