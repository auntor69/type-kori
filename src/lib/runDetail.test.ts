import { describe, expect, it } from "vitest";

import { parseTestType } from "./run";
import {
  isRepeatable,
  retryPreset,
  retryQuery,
  retryUrl,
  runConsistency,
  runSamples,
} from "./runDetail";
import type { RunRecord } from "./progress";

function run(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "run-1",
    ts: 1_700_000_000_000,
    mode: "system",
    textId: "words-1",
    wpm: 42,
    kpm: 210,
    accuracy: 96,
    durationMs: 60_000,
    errors: [],
    ...overrides,
  };
}

describe("the run's consistency", () => {
  it("is computed from the samples, not read from the record", () => {
    const steady = run({ samples: [40, 40, 40, 40] });
    expect(runConsistency(steady)).toBe(100);
    // Same mean, uneven pace: less consistent, and the score has to say so.
    expect(runConsistency(run({ samples: [10, 70, 10, 70] }))).toBeLessThan(50);
  });

  it("is null, not zero, when there is nothing to measure", () => {
    // A run from before sampling existed has no samples at all…
    expect(runConsistency(run())).toBeNull();
    // …and one sample cannot vary, so it is not a measurement either.
    expect(runConsistency(run({ samples: [42] }))).toBeNull();
    // 0 is a real score for a run that really was that erratic.
    expect(runConsistency(run({ samples: [0, 90] }))).toBe(0);
  });

  it("drops samples that are not numbers before drawing a curve", () => {
    expect(runSamples(run())).toEqual([]);
    expect(runSamples(run({ samples: [30, Number.NaN, 44] }))).toEqual([30, 44]);
  });
});

describe("repeating a run", () => {
  it("repeats a timed run at its own duration", () => {
    expect(retryPreset(run({ testType: "time 60" }))).toEqual({ time: 60 });
  });

  it("repeats a word goal at its own count", () => {
    expect(retryPreset(run({ testType: "words 25" }))).toEqual({ words: 25 });
  });

  it("carries the funbox across, because the test type included it", () => {
    expect(retryPreset(run({ testType: "time 30 · numbers" }))).toEqual({
      time: 30,
      funbox: "numbers",
    });
  });

  it("offers nothing to repeat when the run was a fixed target", () => {
    // A lesson, a paste, a drill, the daily challenge and the endless stream are
    // not settings, so there is no preset that could reproduce them. A link that
    // opened a plain test would be a different test wearing the same name.
    for (const testType of ["lesson", "custom", "weak", "adaptive", "daily", "∞", "nonsense"]) {
      expect(retryPreset(run({ testType })), testType).toBeNull();
      expect(isRepeatable(parseTestType(testType)), testType).toBe(false);
    }
    expect(retryPreset(run({ testType: undefined }))).toBeNull();
  });

  it("builds a query string the practice page understands", () => {
    expect(retryQuery(run({ testType: "time 60" }))).toBe("t=60");
    expect(retryQuery(run({ testType: "words 25" }))).toBe("w=25");
    expect(retryQuery(run({ testType: "time 15 · punctuation" }))).toBe("t=15&f=punctuation");
  });

  it("replaces whatever the practice URL was carrying", () => {
    // A visit may already be a daily challenge or a shared preset. Repeating a
    // run means that run's settings and nothing else, so the query is replaced
    // rather than appended to.
    expect(retryUrl("https://example.com/?daily=2026-10-11", run({ testType: "time 60" }))).toBe(
      "https://example.com/?t=60",
    );
    expect(retryUrl("https://example.com/", run({ testType: "lesson" }))).toBeNull();
  });
});
