import { describe, expect, it } from "vitest";

import type { Stats } from "../engine/metrics";
import { minimumFailure } from "./thresholds";

function stats(overrides: Partial<Stats> = {}): Stats {
  return {
    wpm: 50,
    kpm: 200,
    accuracy: 100,
    elapsedMs: 30_000,
    correctWords: 25,
    incorrectWords: 0,
    correctedMistakes: 0,
    targetClusters: 100,
    ...overrides,
  } as Stats;
}

describe("minimumFailure", () => {
  it("does nothing when both minimums are off", () => {
    expect(minimumFailure(stats({ wpm: 0, accuracy: 0 }), { minWpm: 0, minAccuracy: 0 })).toBeNull();
  });

  it("holds a run to its minimum speed once it is past the grace period", () => {
    expect(minimumFailure(stats({ wpm: 25 }), { minWpm: 30, minAccuracy: 0 })).toBe("wpm");
    expect(minimumFailure(stats({ wpm: 35 }), { minWpm: 30, minAccuracy: 0 })).toBeNull();
  });

  it("gives the first few seconds the benefit of the doubt", () => {
    expect(
      minimumFailure(stats({ wpm: 4, elapsedMs: 1_000 }), { minWpm: 30, minAccuracy: 0 }),
    ).toBeNull();
  });

  it("holds a run to its minimum accuracy after enough clusters", () => {
    expect(
      minimumFailure(stats({ accuracy: 70 }), { minWpm: 0, minAccuracy: 90 }),
    ).toBe("accuracy");
    expect(
      minimumFailure(stats({ accuracy: 70, targetClusters: 5 }), { minWpm: 0, minAccuracy: 90 }),
    ).toBeNull();
  });

  it("reports speed before accuracy when both are failing", () => {
    expect(
      minimumFailure(stats({ wpm: 1, accuracy: 50 }), { minWpm: 40, minAccuracy: 90 }),
    ).toBe("wpm");
  });
});
