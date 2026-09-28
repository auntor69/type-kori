/**
 * Target vs typed comparison.
 *
 * Comparison is always word by word: one extra or missing cluster in an early
 * word must never shift every later cluster and mark the rest of the run wrong.
 */

import { normalizeText, splitClusters } from "./unicode";

export type ClusterState = "correct" | "wrong" | "pending" | "extra";

export interface ClusterView {
  /** The target cluster, or "" for a typed cluster beyond the target length. */
  target: string;
  /** What was typed for this position, or null while it is still pending. */
  typed: string | null;
  state: ClusterState;
}

export interface WordComparison {
  target: string;
  typed: string;
  /** One entry per target cluster. */
  clusters: ClusterView[];
  /** Typed clusters past the end of the target word. */
  extra: string[];
  correct: boolean;
}

/** A word the user finished with space or Enter. */
export interface WordResult {
  target: string;
  typed: string;
  correct: boolean;
}

export type WordStatus = "pending" | "active" | "correct" | "wrong";

export interface RenderedWord {
  target: string;
  clusters: ClusterView[];
  /** Typed clusters past the end of the target, shown after the word. */
  extra: string[];
  status: WordStatus;
}

export interface RenderedText {
  words: RenderedWord[];
  /** Index of the word the caret is in. */
  activeIndex: number;
}

export function clustersOf(text: string): string[] {
  return splitClusters(text);
}

export function sameWord(target: string, typed: string): boolean {
  return normalizeText(target) === normalizeText(typed);
}

/** Cluster-by-cluster state for one word while it is being typed. */
export function compareClusters(target: string, typed: string): ClusterView[] {
  const targetClusters = clustersOf(target);
  const typedClusters = clustersOf(typed);

  return targetClusters.map((cluster, index) => {
    if (index >= typedClusters.length) {
      return { target: cluster, typed: null, state: "pending" as const };
    }
    return {
      target: cluster,
      typed: typedClusters[index],
      state: typedClusters[index] === cluster ? ("correct" as const) : ("wrong" as const),
    };
  });
}

export function compareWord(target: string, typed: string): WordComparison {
  const targetClusters = clustersOf(target);
  const typedClusters = clustersOf(typed);

  return {
    target,
    typed,
    clusters: compareClusters(target, typed),
    extra: typedClusters.slice(targetClusters.length),
    correct: sameWord(target, typed),
  };
}

/**
 * Build the view model for the typing area: every target word with its cluster
 * states and its status.
 */
export function renderProgress(
  targetWords: readonly string[],
  committed: readonly WordResult[],
  active: string,
): RenderedText {
  const words = targetWords.map((target, index) => {
    if (index < committed.length) {
      const result = committed[index];
      const comparison = compareWord(target, result.typed);
      return {
        target,
        clusters: comparison.clusters,
        extra: comparison.extra,
        status: result.correct ? ("correct" as const) : ("wrong" as const),
      };
    }

    if (index === committed.length) {
      return {
        target,
        clusters: compareClusters(target, active),
        extra: compareWord(target, active).extra,
        status: "active" as const,
      };
    }

    return {
      target,
      clusters: compareClusters(target, ""),
      extra: [],
      status: "pending" as const,
    };
  });

  return {
    words,
    activeIndex: Math.min(committed.length, Math.max(targetWords.length - 1, 0)),
  };
}

export interface Mistake {
  wordIndex: number;
  target: string;
  typed: string;
  /** First cluster where the words diverge, or null if the typed word is short. */
  expected: string | null;
  actual: string | null;
}

/** The first divergence of every incorrect word, for the results screen. */
export function collectMistakes(
  committed: readonly WordResult[],
  targetWords: readonly string[],
): Mistake[] {
  const mistakes: Mistake[] = [];

  committed.forEach((result, wordIndex) => {
    if (result.correct) return;

    const target = targetWords[wordIndex] ?? result.target;
    const targetClusters = clustersOf(target);
    const typedClusters = clustersOf(result.typed);
    const length = Math.max(targetClusters.length, typedClusters.length);

    let divergence: { expected: string | null; actual: string | null } = {
      expected: null,
      actual: null,
    };

    for (let index = 0; index < length; index += 1) {
      const expected = targetClusters[index] ?? null;
      const actual = typedClusters[index] ?? null;
      if (expected !== actual) {
        divergence = { expected, actual };
        break;
      }
    }

    mistakes.push({
      wordIndex,
      target,
      typed: result.typed,
      expected: divergence.expected,
      actual: divergence.actual,
    });
  });

  return mistakes;
}
