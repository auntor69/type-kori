import { describe, expect, it } from "vitest";

import {
  collectMistakes,
  compareWord,
  renderProgress,
  sameWord,
  type WordResult,
} from "./compare";

const states = (target: string, typed: string) =>
  compareWord(target, typed).clusters.map((cluster) => cluster.state);

describe("compareWord", () => {
  it("marks clusters correct, wrong and pending while a word is being typed", () => {
    // কাজ is two clusters (কা + জ), not three code points.
    expect(states("কাজ", "কাম")).toEqual(["correct", "wrong"]);
    expect(states("কাজ", "কা")).toEqual(["correct", "pending"]);
    expect(states("কাজ", "")).toEqual(["pending", "pending"]);
  });

  it("reports typed clusters past the end of the target as extra", () => {
    const comparison = compareWord("কাজ", "কাজক");

    expect(comparison.extra).toEqual(["ক"]);
    expect(comparison.correct).toBe(false);
    expect(comparison.clusters).toHaveLength(2);
  });

  it("compares whole clusters, not code points", () => {
    // ক্ষ is one cluster: typing only শ is one wrong cluster, not a shift.
    expect(states("ক্ষ", "শ")).toEqual(["wrong"]);
    expect(states("ক্ষ", "ক্ষ")).toEqual(["correct"]);
  });

  it("treats precomposed and decomposed nukta letters as the same word", () => {
    expect(sameWord("ব\u09dc", "ব\u09a1\u09bc")).toBe(true);
    expect(compareWord("ব\u09dc", "ব\u09a1\u09bc").correct).toBe(true);
  });

  it("distinguishes a khanda ta from a hasanta spelling", () => {
    expect(sameWord("উ\u09ceসব", "উত\u09cdসব")).toBe(false);
  });

  it("keeps zero-width joiners significant", () => {
    expect(sameWord("\u09b0\u200d\u09cd\u09af", "\u09b0\u09cd\u09af")).toBe(false);
  });
});

describe("renderProgress", () => {
  const target = ["আমি", "ভালো", "আছি"];

  it("marks finished, active and pending words", () => {
    const committed: WordResult[] = [
      { target: "আমি", typed: "আমি", correct: true },
      { target: "ভালো", typed: "ভাল", correct: false },
    ];
    const view = renderProgress(target, committed, "আছ");

    expect(view.words.map((word) => word.status)).toEqual(["correct", "wrong", "active"]);
    // ভালো splits into ভা + লো, so a typed ভাল leaves the last cluster wrong.
    expect(view.words[1].clusters.map((cluster) => cluster.state)).toEqual(["correct", "wrong"]);
    expect(view.activeIndex).toBe(2);
  });

  it("marks the first word active before anything is committed", () => {
    const view = renderProgress(target, [], "");

    expect(view.words.map((word) => word.status)).toEqual(["active", "pending", "pending"]);
    expect(view.activeIndex).toBe(0);
  });

  it("does not let an early mistake shift later words", () => {
    // An extra cluster in word 1 must not affect word 2's colours.
    const committed: WordResult[] = [{ target: "আমি", typed: "আমিক", correct: false }];
    const view = renderProgress(target, committed, "ভা");

    expect(view.words[1].clusters.map((cluster) => cluster.state)).toEqual([
      "correct",
      "pending",
    ]);
    expect(view.words[2].clusters.map((cluster) => cluster.state)).toEqual([
      "pending",
      "pending",
    ]);
  });
});

describe("collectMistakes", () => {
  it("reports the first divergence of every incorrect word", () => {
    const target = ["কাজ", "ভালো"];
    const committed: WordResult[] = [
      { target: "কাজ", typed: "কাম", correct: false },
      { target: "ভালো", typed: "ভালো", correct: true },
    ];

    expect(collectMistakes(committed, target)).toEqual([
      { wordIndex: 0, target: "কাজ", typed: "কাম", expected: "জ", actual: "ম" },
    ]);
  });

  it("reports a missing cluster as a missing expectation", () => {
    const committed: WordResult[] = [{ target: "কাজ", typed: "কা", correct: false }];

    expect(collectMistakes(committed, ["কাজ"])).toEqual([
      { wordIndex: 0, target: "কাজ", typed: "কা", expected: "জ", actual: null },
    ]);
  });

  it("returns nothing when every word is correct", () => {
    const committed: WordResult[] = [{ target: "কাজ", typed: "কাজ", correct: true }];
    expect(collectMistakes(committed, ["কাজ"])).toEqual([]);
  });
});
