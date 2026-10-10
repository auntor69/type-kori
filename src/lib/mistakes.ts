/**
 * The mistake notebook: the words the user actually mistyped, gathered from the
 * run history, plus a focused drill built out of them.
 *
 * The weak-key drill works one cluster at a time; this works on whole words. A
 * run already records the target word beside the clusters that diverged
 * (`RunRecord.errors`), so the notebook is a pure read of stored data — and the
 * drill it builds is made of words the user has already met, never new text.
 */

import type { PracticeText } from "../engine/text/provider";
import type { RunRecord } from "./progress";

/** How far back the notebook looks. Older misses are history, not practice. */
export const MISTAKE_SCAN_LIMIT = 50;

export interface MistakeWord {
  /** The target word that came out wrong. */
  word: string;
  /** How often it was missed across the scanned runs. */
  count: number;
  /** When it was last missed, to order words missed equally often. */
  lastAt: number;
}

/**
 * The words missed most often, worst first. Runs recorded before the word was
 * stored (only the divergent clusters were) contribute nothing rather than
 * guessing a word back, so the notebook fills in from the next run onward.
 */
export function mistakeWords(
  runs: readonly RunRecord[],
  limit = 12,
  scanLimit = MISTAKE_SCAN_LIMIT,
): MistakeWord[] {
  const words = new Map<string, MistakeWord>();

  for (const run of runs.slice(0, scanLimit)) {
    for (const error of run.errors) {
      const word = error.word?.trim() ?? "";
      if (word.length === 0) continue;

      const current = words.get(word);
      if (current === undefined) {
        words.set(word, { word, count: 1, lastAt: run.ts });
        continue;
      }

      current.count += 1;
      if (run.ts > current.lastAt) current.lastAt = run.ts;
    }
  }

  return [...words.values()]
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt || a.word.localeCompare(b.word, "bn"))
    .slice(0, limit);
}

/**
 * Order a weighted word list so the same word never lands next to itself.
 *
 * Greedy: place whichever word has the most repetitions left without being the
 * one just placed. When only one word can go next — a single word outweighs all
 * the others, as one very bad word and one rare one does — the repeat is
 * unavoidable and the least-bad choice is the same word again.
 */
function spread(weighted: readonly { word: string; remaining: number }[]): string[] {
  const counts = weighted.map((entry) => ({ ...entry }));
  const total = counts.reduce((sum, entry) => sum + entry.remaining, 0);
  const out: string[] = [];
  let previous: string | null = null;

  for (let placed = 0; placed < total; placed += 1) {
    const available = counts.filter((entry) => entry.remaining > 0);
    const preferred = available.filter((entry) => entry.word !== previous);
    const pool = preferred.length > 0 ? preferred : available;
    pool.sort((a, b) => b.remaining - a.remaining);

    const chosen = pool[0];
    if (chosen === undefined) break;

    chosen.remaining -= 1;
    out.push(chosen.word);
    previous = chosen.word;
  }

  return out;
}

/**
 * Build one drill from the notebook: each missed word repeated in proportion to
 * how often it slipped, so the worst word comes up most without the drill
 * turning into a chant. Returns null when there is nothing to drill yet.
 */
export function buildMistakeText(runs: readonly RunRecord[]): PracticeText | null {
  const words = mistakeWords(runs);
  if (words.length === 0) return null;

  const worst = words[0].count;
  const weighted = words.map(({ word, count }) => ({
    word,
    remaining: Math.max(1, Math.round((count / worst) * 3)),
  }));

  return {
    id: "mistakes",
    text: spread(weighted).join(" "),
    difficulty: "hard",
    topic: "mistakes",
    source: "original",
    reviewed: true,
  };
}
