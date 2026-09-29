import { describe, expect, it } from "vitest";

import { createRng } from "../engine/text/provider";
import { splitClusters } from "../engine/unicode";
import { applyFunbox, funboxModes, isFunboxMode } from "./funbox";

const WORDS = ["কষ্ট", "জ্ঞান", "স্কুল", "ক্ষমা", "দ্বার", "নিশ্চয়", "উৎসব", "স্বর", "ঋণ", "যত্ন"];

describe("funbox", () => {
  it("knows its own modes", () => {
    expect(funboxModes).toContain("numbers");
    expect(isFunboxMode("memory")).toBe(true);
    expect(isFunboxMode("chaos")).toBe(false);
    expect(isFunboxMode(7)).toBe(false);
  });

  it("leaves the words alone for none and memory", () => {
    expect(applyFunbox(WORDS, "none", createRng(1))).toEqual(WORDS);
    expect(applyFunbox(WORDS, "memory", createRng(1))).toEqual(WORDS);
  });

  it("returns a copy, never the caller's array", () => {
    const out = applyFunbox(WORDS, "none", createRng(1));
    expect(out).not.toBe(WORDS);
    out[0] = "বদল";
    expect(WORDS[0]).toBe("কষ্ট");
  });

  it("is deterministic for a seed", () => {
    expect(applyFunbox(WORDS, "punctuation", createRng(42))).toEqual(
      applyFunbox(WORDS, "punctuation", createRng(42)),
    );
    expect(applyFunbox(WORDS, "numbers", createRng(7))).toEqual(
      applyFunbox(WORDS, "numbers", createRng(7)),
    );
  });

  it("weaves Bengali numerals into the line", () => {
    const out = applyFunbox(WORDS, "numbers", createRng(3));
    expect(out.length).toBe(WORDS.length);

    const numbers = out.filter((word) => /^[১২৩৪৫৬৭৮৯]+$/.test(word));
    expect(numbers.length).toBeGreaterThan(0);

    for (const number of numbers) {
      expect(number.length).toBeGreaterThanOrEqual(2);
      expect(number.length).toBeLessThanOrEqual(4);
    }

    // The words that are not numbers are untouched.
    out.forEach((word, index) => {
      if (index % 4 !== 1) expect(word).toBe(WORDS[index]);
    });
  });

  it("adds Bangla punctuation without losing the word", () => {
    const out = applyFunbox(WORDS, "punctuation", createRng(5));
    const marks = ["।", ",", "—", "!", "”", "’", "“", "‘"];

    expect(out.some((word) => marks.some((mark) => word.includes(mark)))).toBe(true);
    out.forEach((word, index) => {
      const stripped = marks.reduce((current, mark) => current.replaceAll(mark, ""), word);
      expect(stripped).toBe(WORDS[index]);
    });
  });

  it("reverses whole clusters, so a conjunct stays one unit", () => {
    const out = applyFunbox(["কষ্ট"], "backwards", createRng(1));
    expect(out[0]).toBe(splitClusters("কষ্ট").reverse().join(""));
    expect(splitClusters(out[0]).length).toBe(splitClusters("কষ্ট").length);
  });
});
