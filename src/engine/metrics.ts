/**
 * Metric formulas. Section 7.5 of docs/MASTERPLAN.md fixes these definitions and
 * they are shown on the results screen, so they must not drift.
 *
 *   WPM         = correct words ÷ elapsed minutes
 *   KPM         = keystrokes ÷ elapsed minutes
 *   accuracy    = correct clusters ÷ total target clusters in committed words
 *   consistency = 100 × (1 − standard deviation ÷ mean) of the per-second WPM
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

/**
 * Consistency: how steady the speed was, from the per-second WPM the island
 * samples during a run. 100 is a metronome, 0 is a run whose per-second speed
 * varies as much as its average. Reported on its own rather than folded into
 * WPM, because a fast-but-erratic run and a steady one read the same in a single
 * average while feeling completely different.
 *
 * Fewer than two samples means nothing to compare, so the score is 0: an instant
 * run and a run with no samples are not perfectly consistent.
 */
export function consistency(samples: readonly number[]): number {
  const usable = samples.filter((value) => Number.isFinite(value));
  if (usable.length < 2) return 0;

  const mean = usable.reduce((sum, value) => sum + value, 0) / usable.length;
  if (mean <= 0) return 0;

  const variance =
    usable.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / usable.length;
  const deviation = Math.sqrt(variance);
  const score = (1 - deviation / mean) * 100;

  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/**
 * Append one speed sample for a run in progress, given how long it has been
 * going and the speed right now.
 *
 * Called on every tick, so it has to be idempotent within a second: a tick that
 * has not crossed a whole second adds nothing, which keeps the series at exactly
 * one value per second of the run instead of one per tick. A tick that jumps
 * several seconds (a blocked main thread) adds the single value it has and the
 * gap is simply never sampled — a missing sample is honest, an invented one would
 * not be.
 */
export function appendSpeedSample(
  samples: readonly number[],
  elapsedMs: number,
  wpm: number,
): number[] {
  const second = Math.floor(elapsedMs / 1000);
  if (second <= 0 || samples.length >= second) return samples as number[];
  return [...samples, wpm];
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
