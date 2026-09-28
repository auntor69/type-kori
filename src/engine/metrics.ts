/**
 * Metric formulas. Section 7.5 of docs/MASTERPLAN.md fixes these definitions and
 * they are shown on the results screen, so they must not drift.
 *
 *   WPM       = correct words ÷ elapsed minutes
 *   KPM       = keystrokes ÷ elapsed minutes
 *   accuracy  = correct clusters ÷ total target clusters in committed words
 */

import { clustersOf, type WordResult } from "./compare";

export interface StatsInput {
  /** Only committed words are scored. */
  committed: readonly WordResult[];
  /** Raw effort: appended code points plus backspaces. */
  keystrokes: number;
  /** Errors the user backspaced away. Shown, never punished. */
  correctedMistakes: number;
  elapsedMs: number;
}

export interface Stats {
  words: number;
  correctWords: number;
  incorrectWords: number;
  targetClusters: number;
  correctClusters: number;
  keystrokes: number;
  correctedMistakes: number;
  elapsedMs: number;
  wpm: number;
  kpm: number;
  accuracy: number;
}

export function elapsedMinutes(elapsedMs: number): number {
  return elapsedMs / 60_000;
}

/** Correct words per minute. Returns 0 for an empty or instant run. */
export function wordsPerMinute(correctWords: number, elapsedMs: number): number {
  const minutes = elapsedMinutes(elapsedMs);
  if (minutes <= 0) return 0;
  return Math.round(correctWords / minutes);
}

export function keystrokesPerMinute(keystrokes: number, elapsedMs: number): number {
  const minutes = elapsedMinutes(elapsedMs);
  if (minutes <= 0) return 0;
  return Math.round(keystrokes / minutes);
}

/** Percentage with one decimal, so a 89.6% run cannot look like a pass. */
export function accuracyPercent(correctClusters: number, targetClusters: number): number {
  if (targetClusters <= 0) return 0;
  return Math.round((correctClusters / targetClusters) * 1000) / 10;
}

export function countTargetClusters(words: readonly string[]): number {
  return words.reduce((total, word) => total + clustersOf(word).length, 0);
}

export function countCorrectClusters(target: string, typed: string): number {
  const targetClusters = clustersOf(target);
  const typedClusters = clustersOf(typed);

  let correct = 0;
  for (let index = 0; index < targetClusters.length; index += 1) {
    if (targetClusters[index] === typedClusters[index]) correct += 1;
  }
  return correct;
}

export function computeStats(input: StatsInput): Stats {
  const correctWords = input.committed.filter((word) => word.correct).length;
  const targetClusters = input.committed.reduce(
    (total, word) => total + clustersOf(word.target).length,
    0,
  );
  const correctClusters = input.committed.reduce(
    (total, word) => total + countCorrectClusters(word.target, word.typed),
    0,
  );

  return {
    words: input.committed.length,
    correctWords,
    incorrectWords: input.committed.length - correctWords,
    targetClusters,
    correctClusters,
    keystrokes: input.keystrokes,
    correctedMistakes: input.correctedMistakes,
    elapsedMs: input.elapsedMs,
    wpm: wordsPerMinute(correctWords, input.elapsedMs),
    kpm: keystrokesPerMinute(input.keystrokes, input.elapsedMs),
    accuracy: accuracyPercent(correctClusters, targetClusters),
  };
}

/** `0:41`, `1:05`, `12:00`. */
export function formatDuration(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.round(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
