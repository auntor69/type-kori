import { describe, expect, it } from "vitest";

import { adaptivePlan, buildAdaptiveText } from "./adaptive";
import type { ErrorMap, RunRecord } from "./progress";

function run(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "r1",
    ts: 1_000,
    mode: "system",
    textId: "t1",
    wpm: 30,
    kpm: 100,
    accuracy: 90,
    durationMs: 60_000,
    errors: [],
    ...overrides,
  };
}

const vocabulary = ["ক্ষমা", "কষ্ট", "জ্ঞান", "স্কুল", "নদী", "ফুল", "পাখি", "বই", "মাঠ", "আকাশ"];

describe("adaptivePlan", () => {
  it("is empty with no history and no vocabulary", () => {
    const plan = adaptivePlan({}, [], []);
    expect(plan.words).toEqual([]);
    expect(plan.review).toBe(0);
    expect(plan.fresh).toBe(0);
  });

  it("re-drills the words you actually missed", () => {
    const runs = [
      run({
        errors: [
          { word: "জ্ঞান", expected: "জ্ঞ", typed: "জ" },
          { word: "জ্ঞান", expected: "জ্ঞ", typed: "জ" },
        ],
      }),
    ];

    const plan = adaptivePlan({}, runs, vocabulary);
    expect(plan.words).toContain("জ্ঞান");
    expect(plan.review).toBe(1);
    // A word missed twice repeats, because the drill is weighted by misses.
    expect(plan.words.filter((word) => word === "জ্ঞান").length).toBeGreaterThan(1);
  });

  it("picks real vocabulary words that carry the weakest clusters", () => {
    const map: ErrorMap = { "ক্ষ": { missed: 6, seen: 8 } };
    const plan = adaptivePlan(map, [], vocabulary);

    expect(plan.words).toContain("ক্ষমা");
    expect(plan.cluster).toBeGreaterThan(0);
  });

  it("only counts a carrier word once, even for two weak clusters", () => {
    const map: ErrorMap = { "ক": { missed: 5, seen: 6 }, "ষ": { missed: 4, seen: 5 } };
    const plan = adaptivePlan(map, [], vocabulary);
    // কষ্ট carries both ক and ষ but must not be weighed twice.
    expect(plan.words.filter((word) => word === "কষ্ট").length).toBe(1);
  });

  it("adds fresh vocabulary so the drill is not a six-word chant", () => {
    const runs = [run({ errors: [{ word: "জ্ঞান", expected: "জ্ঞ", typed: "জ" }] })];
    const plan = adaptivePlan({}, runs, vocabulary, { entryLimit: 8 });
    expect(plan.fresh).toBeGreaterThan(0);
    expect(plan.words.length).toBeGreaterThan(plan.review);
  });

  it("never puts the same word next to itself", () => {
    const map: ErrorMap = { "ক": { missed: 20, seen: 20 } };
    const plan = adaptivePlan(map, [], vocabulary, { entryLimit: 6 });
    for (let index = 1; index < plan.words.length; index += 1) {
      expect(plan.words[index]).not.toBe(plan.words[index - 1]);
    }
  });

  it("is deterministic for a seed", () => {
    const map: ErrorMap = { "ক": { missed: 3, seen: 4 } };
    const first = adaptivePlan(map, [], vocabulary, { seed: 7 });
    const second = adaptivePlan(map, [], vocabulary, { seed: 7 });
    expect(first.words).toEqual(second.words);
  });

  it("respects the entry limit for how many distinct words it weighs", () => {
    const plan = adaptivePlan({}, [], vocabulary, { entryLimit: 3 });
    const distinct = new Set(plan.words);
    expect(distinct.size).toBeLessThanOrEqual(3);
  });
});

describe("buildAdaptiveText", () => {
  it("returns null with nothing to build from", () => {
    expect(buildAdaptiveText({}, [], [])).toBeNull();
  });

  it("builds a reviewed drill text from the plan", () => {
    const text = buildAdaptiveText({ "ক্ষ": { missed: 4, seen: 5 } }, [], vocabulary, { entryLimit: 4 });
    expect(text).not.toBeNull();
    expect(text?.id).toBe("adaptive");
    expect(text?.topic).toBe("adaptive");
    expect(text?.text.split(" ").length).toBeGreaterThan(0);
  });
});
