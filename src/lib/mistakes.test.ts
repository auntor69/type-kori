import { describe, expect, it } from "vitest";

import { mistakeWords, buildMistakeText } from "./mistakes";
import { loadRuns, recordRun, type RunRecord } from "./progress";
import { createMemoryStorage } from "./storage";

const run = (ts: number, words: readonly string[]): RunRecord => ({
  id: `run-${ts}`,
  ts,
  mode: "system",
  textId: "easy-01",
  wpm: 30,
  kpm: 120,
  accuracy: 90,
  durationMs: 60_000,
  errors: words.map((word) => ({ word, expected: "ক", typed: "খ" })),
});

describe("mistakeWords", () => {
  it("returns nothing with no runs", () => {
    expect(mistakeWords([])).toEqual([]);
  });

  it("counts every miss, so two slips in one run outweigh one in another", () => {
    const words = mistakeWords([run(3, ["কষ্ট", "কষ্ট"]), run(2, ["কষ্ট"]), run(1, ["জ্ঞান"])]);

    expect(words.map((entry) => entry.word)).toEqual(["কষ্ট", "জ্ঞান"]);
    expect(words[0].count).toBe(3);
    expect(words[1].count).toBe(1);
  });

  it("orders words missed equally often by when they were last missed", () => {
    const words = mistakeWords([run(5, ["কম"]), run(9, ["বেশ"])]);
    expect(words.map((entry) => entry.word)).toEqual(["বেশ", "কম"]);
  });

  it("skips errors recorded before the word was stored", () => {
    const legacy: RunRecord = {
      ...run(1, []),
      errors: [{ expected: "ক", typed: "খ" }],
    };
    expect(mistakeWords([legacy])).toEqual([]);
  });

  it("caps the list at the limit", () => {
    const words = mistakeWords([run(1, ["ক", "খ", "গ", "ঘ"])], 2);
    expect(words).toHaveLength(2);
  });
});

describe("buildMistakeText", () => {
  it("returns null with an empty notebook", () => {
    expect(buildMistakeText([])).toBeNull();
  });

  it("weighs the drill toward the word missed most", () => {
    const text = buildMistakeText([run(1, ["কষ্ট"]), run(2, ["কষ্ট"]), run(3, ["কষ্ট"]), run(4, ["জ্ঞান"])]);
    expect(text).not.toBeNull();

    const words = text?.text.split(" ") ?? [];
    const misses = words.filter((word) => word === "কষ্ট").length;
    const rarer = words.filter((word) => word === "জ্ঞান").length;

    expect(text?.id).toBe("mistakes");
    expect(misses).toBeGreaterThan(rarer);
    expect(misses + rarer).toBe(words.length);
  });

  it("never repeats a word twice in a row when it can avoid it", () => {
    const text = buildMistakeText([run(1, ["ক"]), run(2, ["খ"]), run(3, ["গ"])]);
    const words = text?.text.split(" ") ?? [];

    for (let index = 1; index < words.length; index += 1) {
      expect(words[index]).not.toBe(words[index - 1]);
    }
  });

  it("repeats a word only when one word outweighs all the others", () => {
    // The whole notebook is one word, so there is nothing to alternate with.
    expect(buildMistakeText([run(1, ["ক"])])?.text).toBe("ক ক ক");
  });
});

/**
 * The end-to-end path the app actually takes: a finished run goes through
 * `recordRun`, and the notebook reads it back out of storage. This is the part
 * that a unit test of the ranking alone cannot see — if the word or the samples
 * were dropped by the serializer, every test above would still pass.
 */
describe("a recorded run", () => {
  it("keeps the mistyped word and the speed samples through storage", () => {
    const storage = createMemoryStorage();

    recordRun(
      {
        id: "run-1",
        ts: 1,
        mode: "system",
        textId: "easy-01",
        wpm: 30,
        kpm: 120,
        accuracy: 90,
        durationMs: 60_000,
        testType: "time 60",
        samples: [30, 40, 50],
        errors: [{ word: "কষ্ট", expected: "্", typed: "" }],
      },
      [{ target: "কষ্ট", typed: "কস্ট", correct: false }],
      storage,
    );

    const stored = loadRuns(storage);
    expect(stored).toHaveLength(1);
    expect(stored[0].errors[0].word).toBe("কষ্ট");
    expect(stored[0].samples).toEqual([30, 40, 50]);

    // And the notebook can actually read what the record wrote.
    expect(mistakeWords(stored).map((entry) => entry.word)).toEqual(["কষ্ট"]);
    expect(buildMistakeText(stored)?.id).toBe("mistakes");
  });
});
