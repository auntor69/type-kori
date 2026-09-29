/**
 * Minimum speed and accuracy. When the user sets a floor, a run that drops below
 * it ends early and says why, instead of quietly producing a number they already
 * said was not good enough.
 *
 * The two grace periods matter: at four seconds in, and before twenty clusters
 * have been typed, the averages are still dominated by the start of the run, so
 * checking them there would fail a fresh run that is actually fine.
 */

import type { Stats } from "../engine/metrics";

export type FailureReason = "wpm" | "accuracy";

export const MIN_WPM_GRACE_MS = 4_000;
export const MIN_ACCURACY_GRACE_CLUSTERS = 20;

export interface Minimums {
  /** 0 turns the check off. */
  minWpm: number;
  /** 0 turns the check off. */
  minAccuracy: number;
}

export function minimumFailure(stats: Stats, limits: Minimums): FailureReason | null {
  if (
    limits.minWpm > 0 &&
    stats.elapsedMs >= MIN_WPM_GRACE_MS &&
    stats.wpm < limits.minWpm
  ) {
    return "wpm";
  }

  if (
    limits.minAccuracy > 0 &&
    stats.targetClusters >= MIN_ACCURACY_GRACE_CLUSTERS &&
    stats.accuracy < limits.minAccuracy
  ) {
    return "accuracy";
  }

  return null;
}
