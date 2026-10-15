import { describe, expect, it } from "vitest";

import { isCompatiblePrefix, letterCode, nextRomanLetters, romanKeyHint } from "./phoneticHint";

describe("isCompatiblePrefix", () => {
  it("accepts a provisional half-typed cluster", () => {
    // ক is a prefix of the cluster কে.
    expect(isCompatiblePrefix("ক", "কেমন")).toBe(true);
    expect(isCompatiblePrefix("কে", "কেমন")).toBe(true);
    expect(isCompatiblePrefix("কেম", "কেমন")).toBe(true);
    expect(isCompatiblePrefix("কেমন", "কেমন")).toBe(true);
  });

  it("rejects a cluster that overshoots its target", () => {
    // মো is longer than the target cluster ম.
    expect(isCompatiblePrefix("কেমো", "কেমন")).toBe(false);
  });

  it("rejects a divergent cluster", () => {
    expect(isCompatiblePrefix("খ", "কেমন")).toBe(false);
  });

  it("rejects output longer than the whole word", () => {
    expect(isCompatiblePrefix("কেমনx", "কেমন")).toBe(false);
  });

  it("rejects an empty output, which carries no information", () => {
    expect(isCompatiblePrefix("", "কেমন")).toBe(false);
  });
});

describe("nextRomanLetters", () => {
  it("suggests the first letter from an empty buffer", () => {
    expect(nextRomanLetters("", "কেমন")).toContain("k");
  });

  it("keeps suggesting as the word goes on", () => {
    expect(nextRomanLetters("k", "কেমন")).toContain("e");
    expect(nextRomanLetters("ke", "কেমন")).toContain("m");
  });

  it("does not suggest a letter that breaks the word", () => {
    // kal is not a dictionary word: 'k' after ka would give কাক, whose ক
    // cluster overshoots the target's ল.
    expect(nextRomanLetters("ka", "কাল")).not.toContain("k");
    expect(nextRomanLetters("ka", "কাল")).toContain("l");
  });

  it("follows a dictionary spelling the rules alone miss", () => {
    // The rules give gel → গেল and leave the final `o` suppressed; only the
    // dictionary spells গেলো, so it is what keeps the hint suggesting `o` here.
    expect(nextRomanLetters("gel", "গেলো")).toContain("o");
    expect(nextRomanLetters("gelo", "গেলো")).toHaveLength(0);
  });

  it("suggests a letter the engine can actually finish a word with", () => {
    // kal → কাল, a word the grammar produces without a dictionary.
    expect(nextRomanLetters("", "কাল")).toContain("k");
    expect(nextRomanLetters("k", "কাল")).toContain("a");
    expect(nextRomanLetters("ka", "কাল")).toContain("l");
  });

  it("returns nothing once the word is complete", () => {
    expect(nextRomanLetters("kal", "কাল")).toHaveLength(0);
  });
});

describe("romanKeyHint", () => {
  it("maps letters to keyboard codes", () => {
    expect(letterCode("k")).toBe("KeyK");
    expect(letterCode("K")).toBeNull();
    expect(romanKeyHint("", "কাল")).toContain("KeyK");
  });
});
