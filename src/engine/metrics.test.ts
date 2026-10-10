import { describe, expect, it } from "vitest";

import type { WordResult } from "./compare";
import {
  accuracyPercent,
  appendSpeedSample,
  computeStats,
  consistency,
  countCorrectClusters,
  countTargetClusters,
  formatDuration,
  keystrokesPerMinute,
  wordsPerMinute,
} from "./metrics";

const word = (target: string, typed: string): WordResult => ({
  target,
  typed,
  correct: target === typed,
});

describe("wordsPerMinute", () => {
  it("matches the worked example from the plan: 8 of 10 words in 60s is 8 WPM", () => {
    expect(wordsPerMinute(8, 60_000)).toBe(8);
  });

  it("scales with the elapsed time", () => {
    expect(wordsPerMinute(5, 30_000)).toBe(10);
    expect(wordsPerMinute(20, 120_000)).toBe(10);
    expect(wordsPerMinute(1, 90_000)).toBe(1);
  });

  it("returns 0 instead of dividing by zero", () => {
    expect(wordsPerMinute(0, 0)).toBe(0);
    expect(wordsPerMinute(5, 0)).toBe(0);
  });
});

describe("keystrokesPerMinute", () => {
  it("counts raw effort", () => {
    expect(keystrokesPerMinute(120, 60_000)).toBe(120);
    expect(keystrokesPerMinute(90, 30_000)).toBe(180);
    expect(keystrokesPerMinute(10, 0)).toBe(0);
  });
});

describe("accuracyPercent", () => {
  it("is correct clusters over target clusters", () => {
    expect(accuracyPercent(9, 10)).toBe(90);
    expect(accuracyPercent(10, 10)).toBe(100);
    expect(accuracyPercent(0, 10)).toBe(0);
  });

  it("keeps one decimal so a near miss cannot look like a pass", () => {
    expect(accuracyPercent(121, 135)).toBe(89.6);
    expect(accuracyPercent(122, 135)).toBe(90.4);
  });

  it("returns 0 when there was nothing to score", () => {
    expect(accuracyPercent(0, 0)).toBe(0);
  });
});

describe("cluster counting", () => {
  it("counts target clusters, not code points", () => {
    expect(countTargetClusters(["আমি", "ভালো"])).toBe(4);
    expect(countTargetClusters(["সংখ্যা"])).toBe(2);
  });

  it("ignores typed clusters past the end of the target", () => {
    // কাজ is কা + জ; the extra ক in কাজক must not change the score.
    expect(countCorrectClusters("কাজ", "কাজক")).toBe(2);
    expect(countCorrectClusters("কাজ", "কাম")).toBe(1);
    expect(countCorrectClusters("কাজ", "")).toBe(0);
  });
});

describe("computeStats", () => {
  it("scores only committed words", () => {
    const stats = computeStats({
      committed: [word("আমি", "আমি"), word("ভালো", "ভাল"), word("আছি", "আছি")],
      keystrokes: 20,
      correctedMistakes: 1,
      elapsedMs: 60_000,
    });

    expect(stats.words).toBe(3);
    expect(stats.correctWords).toBe(2);
    expect(stats.incorrectWords).toBe(1);
    expect(stats.targetClusters).toBe(6);
    expect(stats.correctClusters).toBe(5);
    expect(stats.accuracy).toBe(83.3);
    expect(stats.wpm).toBe(2);
    expect(stats.kpm).toBe(20);
    expect(stats.correctedMistakes).toBe(1);
  });

  it("reports zeros for an empty run", () => {
    const stats = computeStats({
      committed: [],
      keystrokes: 0,
      correctedMistakes: 0,
      elapsedMs: 0,
    });

    expect(stats).toMatchObject({
      words: 0,
      correctWords: 0,
      correctClusters: 0,
      targetClusters: 0,
      wpm: 0,
      kpm: 0,
      accuracy: 0,
    });
  });
});

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(41_000)).toBe("0:41");
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(720_000)).toBe("12:00");
    expect(formatDuration(-10)).toBe("0:00");
  });
});

describe("appendSpeedSample", () => {
  it("adds nothing before the first whole second", () => {
    expect(appendSpeedSample([], 0, 50)).toEqual([]);
    expect(appendSpeedSample([], 250, 50)).toEqual([]);
    expect(appendSpeedSample([], 999, 50)).toEqual([]);
  });

  it("adds exactly one value per second, however often it is called", () => {
    let samples = appendSpeedSample([], 1_000, 40);
    samples = appendSpeedSample(samples, 1_100, 99);
    samples = appendSpeedSample(samples, 1_900, 99);
    expect(samples).toEqual([40]);

    samples = appendSpeedSample(samples, 2_000, 60);
    expect(samples).toEqual([40, 60]);
  });

  it("records one value, never an invented one, across a skipped second", () => {
    const samples = appendSpeedSample([], 3_500, 45);
    expect(samples).toEqual([45]);
  });

  it("keeps the series in the order the samples arrived", () => {
    let samples: number[] = [];
    for (let second = 1; second <= 5; second += 1) {
      samples = appendSpeedSample(samples, second * 1_000, second * 10);
    }
    expect(samples).toEqual([10, 20, 30, 40, 50]);
    expect(consistency(samples)).toBeGreaterThan(0);
  });
});

describe("consistency", () => {
  it("is 100 for a perfectly steady run", () => {
    expect(consistency([60, 60, 60, 60])).toBe(100);
  });

  it("drops as the per-second speed varies", () => {
    // Mean 50, standard deviation 10, so 1 − 10/50 = 0.8.
    expect(consistency([40, 60])).toBe(80);
  });

  it("is 0 when there is nothing to compare", () => {
    expect(consistency([])).toBe(0);
    expect(consistency([50])).toBe(0);
  });

  it("is 0 when the mean is 0", () => {
    expect(consistency([0, 0, 0])).toBe(0);
  });

  it("never goes below 0 or above 100", () => {
    // Mean 50, deviation 50: the raw score would be 0, and a wilder run negative.
    expect(consistency([0, 100])).toBe(0);
    expect(consistency([0, 0, 100])).toBe(0);
  });

  it("ignores values that are not finite", () => {
    expect(consistency([60, Number.NaN, 60])).toBe(100);
  });
});
