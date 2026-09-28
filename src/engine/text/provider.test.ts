import { describe, expect, it } from "vitest";

import {
  createRng,
  pickText,
  randomSeed,
  textsForDifficulty,
  validateTextSet,
  wordsOf,
  type PracticeText,
} from "./provider";

const texts: PracticeText[] = [
  { id: "a", text: "আমি বাংলা লিখি", difficulty: "easy", topic: "everyday", source: "original", reviewed: true },
  { id: "b", text: "আজ আকাশ পরিষ্কার", difficulty: "easy", topic: "weather", source: "original", reviewed: true },
  { id: "c", text: "দৃষ্টি", difficulty: "hard", topic: "body", source: "original", reviewed: false },
];

describe("createRng", () => {
  it("is deterministic for a seed and stays inside [0, 1)", () => {
    const first = createRng(42);
    const second = createRng(42);

    for (let index = 0; index < 20; index += 1) {
      const value = first();
      expect(value).toBe(second());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("produces different streams for different seeds", () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it("generates a seed in range", () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
  });
});

describe("pickText", () => {
  it("returns a text of the requested difficulty", () => {
    const choice = pickText(texts, { difficulty: "easy", rng: createRng(7) });
    expect(choice?.difficulty).toBe("easy");
  });

  it("is deterministic for a seed", () => {
    const first = pickText(texts, { rng: createRng(3) })?.id;
    const second = pickText(texts, { rng: createRng(3) })?.id;
    expect(first).toBe(second);
  });

  it("avoids the excluded ids", () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const choice = pickText(texts, { difficulty: "easy", exclude: ["a"], rng: createRng(seed) });
      expect(choice?.id).toBe("b");
    }
  });

  it("repeats rather than returning nothing when everything is excluded", () => {
    const choice = pickText(texts, { exclude: ["a", "b", "c"], rng: createRng(1) });
    expect(choice).not.toBeNull();
  });

  it("returns null for an empty set", () => {
    expect(pickText([])).toBeNull();
  });
});

describe("textsForDifficulty", () => {
  it("filters, and treats a missing difficulty as everything", () => {
    expect(textsForDifficulty(texts, "hard").map((text) => text.id)).toEqual(["c"]);
    expect(textsForDifficulty(texts)).toHaveLength(3);
    expect(textsForDifficulty(texts, "all")).toHaveLength(3);
  });

  it("does not hand out the internal array", () => {
    const all = textsForDifficulty(texts);
    all.pop();
    expect(texts).toHaveLength(3);
  });
});

describe("wordsOf", () => {
  it("splits a text into words", () => {
    expect(wordsOf("আমি বাংলা লিখি")).toEqual(["আমি", "বাংলা", "লিখি"]);
    expect(wordsOf(texts[0])).toEqual(["আমি", "বাংলা", "লিখি"]);
    expect(wordsOf("")).toEqual([]);
  });
});

describe("validateTextSet", () => {
  it("accepts a well formed set and lists the unreviewed texts", () => {
    const report = validateTextSet(texts);

    expect(report.errors).toEqual([]);
    expect(report.unreviewed).toEqual(["c"]);
  });

  it("rejects Latin text, other scripts and bad metadata", () => {
    const report = validateTextSet([
      { id: "x", text: "ami bangla likhi", difficulty: "easy", topic: "t", source: "original", reviewed: true },
      { id: "y", text: "क्ष", difficulty: "medium", topic: "t", source: "original", reviewed: true },
      { id: "z", text: "ঠিক আছে", difficulty: "extreme", topic: "t", source: "scraped", reviewed: true },
    ]);

    expect(report.errors).toEqual([
      "entry 0: text contains characters outside the Bengali block",
      "entry 1: text contains characters outside the Bengali block",
      'entry 2: difficulty must be one of easy, medium, hard',
      'entry 2: source must be "original"',
    ]);
  });

  it("catches duplicate and missing ids and empty text", () => {
    const report = validateTextSet([
      { id: "same", text: "আমি", difficulty: "easy", topic: "t", source: "original", reviewed: true },
      { id: "same", text: "তুমি", difficulty: "easy", topic: "t", source: "original", reviewed: true },
      { text: "  ", difficulty: "easy", topic: "t", source: "original", reviewed: true },
    ]);

    expect(report.errors).toEqual([
      "entry 1: duplicate id same",
      "entry 2: missing id",
      "entry 2: missing text",
    ]);
  });

  it("rejects a non-array payload", () => {
    expect(validateTextSet({}).errors).toEqual(["content set must be an array"]);
    expect(validateTextSet([null]).errors).toEqual(["entry 0: not an object"]);
  });
});
