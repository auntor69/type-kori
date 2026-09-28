import { describe, expect, it } from "vitest";

import {
  classifyCodePoint,
  countCodePoints,
  hasLatinLetters,
  isBanglaOnly,
  isConsonant,
  normalizeText,
  splitClusters,
  splitWords,
} from "./unicode";

/** A tricky-word table: conjuncts, reph, ya-phala, nukta forms and digits. */
const TRICKY: readonly { word: string; clusters: string[]; note: string }[] = [
  { word: "ক্ষ", clusters: ["ক্ষ"], note: "ka + hasanta + ssa, one conjunct" },
  { word: "স্ত", clusters: ["স্ত"], note: "sa + hasanta + ta" },
  { word: "ন্দ", clusters: ["ন্দ"], note: "na + hasanta + da" },
  { word: "র্ম", clusters: ["র্ম"], note: "reph: ra + hasanta + ma" },
  { word: "সংখ্যা", clusters: ["সং", "খ্যা"], note: "anusvara then kha + hasanta + ya + aa" },
  { word: "বিশ্ব", clusters: ["বি", "শ্ব"], note: "i-sign then sha + hasanta + ba" },
  { word: "প্রশ্ন", clusters: ["প্র", "শ্ন"], note: "two conjuncts in one word" },
  { word: "দৃষ্টি", clusters: ["দৃ", "ষ্টি"], note: "u-sign then ssa + hasanta + tta + i-sign" },
  { word: "স্বাস্থ্য", clusters: ["স্বা", "স্থ্য"], note: "two conjuncts, the second with three parts" },
  { word: "কিং", clusters: ["কিং"], note: "consonant with i-sign and anusvara" },
  { word: "ত্", clusters: ["ত্"], note: "a hasanta with nothing to join" },
  { word: "\u09ce", clusters: ["\u09ce"], note: "khanda ta is its own code point" },
  { word: "১২৩", clusters: ["১", "২", "৩"], note: "each Bengali digit stands alone" },
  { word: "abc", clusters: ["a", "b", "c"], note: "Latin letters are clusters too" },
  { word: "।", clusters: ["।"], note: "danda" },
];

describe("normalizeText", () => {
  it("makes precomposed and decomposed nukta letters equal", () => {
    const precomposed = "\u09dc"; // ড় as one code point
    const decomposed = "\u09a1\u09bc"; // ড + nukta

    expect(precomposed).not.toBe(decomposed);
    expect(normalizeText(precomposed)).toBe(normalizeText(decomposed));
    expect(splitClusters(precomposed)).toEqual(splitClusters(decomposed));
  });

  it("keeps zero-width joiners, which change how a conjunct renders", () => {
    const withJoiner = "\u09b0\u200d\u09cd\u09af";
    const withoutJoiner = "\u09b0\u09cd\u09af";

    expect(normalizeText(withJoiner)).toContain("\u200d");
    expect(normalizeText(withJoiner)).not.toBe(normalizeText(withoutJoiner));
  });
});

describe("splitClusters", () => {
  it.each(TRICKY)("splits $word ($note)", ({ word, clusters }) => {
    expect(splitClusters(word)).toEqual(clusters);
  });

  it("agrees with Intl.Segmenter on the tricky word table", () => {
    const segmenter = new Intl.Segmenter("bn", { granularity: "grapheme" });

    for (const { word } of TRICKY) {
      const expected = [...segmenter.segment(normalizeText(word))].map((entry) => entry.segment);
      expect(splitClusters(word), word).toEqual(expected);
    }
  });

  it("treats the khanda ta and the hasanta spelling as different code points", () => {
    const khandaTa = "\u0989\u09ce\u09b8\u09ac"; // উ ৎ স ব
    const hasanta = "\u0989\u09a4\u09cd\u09b8\u09ac"; // উ ত + hasanta স ব

    expect(splitClusters(khandaTa)).toEqual(["\u0989", "\u09ce", "\u09b8", "\u09ac"]);
    expect(splitClusters(hasanta)).toEqual(["\u0989", "\u09a4\u09cd\u09b8", "\u09ac"]);
  });

  it("keeps a joiner on either side of the hasanta inside one cluster", () => {
    expect(splitClusters("\u09b0\u200d\u09cd\u09af")).toHaveLength(1);
    expect(splitClusters("\u09b0\u09cd\u200d\u09af")).toHaveLength(1);
    expect(splitClusters("\u09b0\u200c\u09cd\u09af")).toHaveLength(1);
  });

  it("handles empty text and lone combining marks", () => {
    expect(splitClusters("")).toEqual([]);
    expect(splitClusters("\u09cd")).toEqual(["\u09cd"]);
    expect(splitClusters("\u09be")).toEqual(["\u09be"]);
  });

  it("keeps whole words of a sentence in order, whitespace included", () => {
    // Words are split before comparison, so the space clusters never reach
    // scoring; they are kept here so no code point is ever silently dropped.
    expect(splitClusters("আমি ভালো আছি")).toEqual([
      "আ",
      "মি",
      " ",
      "ভা",
      "লো",
      " ",
      "আ",
      "ছি",
    ]);
  });
});

describe("classification helpers", () => {
  it("recognizes base letters and leaves marks out", () => {
    expect(isConsonant("ক".codePointAt(0) as number)).toBe(true);
    expect(isConsonant("\u09ce".codePointAt(0) as number)).toBe(true);
    expect(isConsonant("া".codePointAt(0) as number)).toBe(false);
    expect(isConsonant("অ".codePointAt(0) as number)).toBe(false);
  });

  it("classifies the characters a validator needs to reason about", () => {
    expect(classifyCodePoint(0x0995)).toBe("consonant");
    expect(classifyCodePoint(0x0985)).toBe("independent-vowel");
    expect(classifyCodePoint(0x09cd)).toBe("hasanta");
    expect(classifyCodePoint(0x09bc)).toBe("nukta");
    expect(classifyCodePoint(0x200d)).toBe("joiner");
    expect(classifyCodePoint(0x0982)).toBe("syllable-mark");
    expect(classifyCodePoint(0x09e7)).toBe("bengali-digit");
    expect(classifyCodePoint(0x31)).toBe("ascii-digit");
    expect(classifyCodePoint(0x0964)).toBe("punctuation");
    expect(classifyCodePoint(0x20)).toBe("space");
    expect(classifyCodePoint(0x41)).toBe("latin");
  });

  it("splits words on whitespace only", () => {
    expect(splitWords("  আমি   ভালো\nআছি ")).toEqual(["আমি", "ভালো", "আছি"]);
    expect(splitWords("")).toEqual([]);
  });

  it("counts code points, not UTF-16 units", () => {
    expect(countCodePoints("ক্ষ")).toBe(3);
    expect("ক্ষ".length).toBe(3);
    expect(countCodePoints("\u09ce")).toBe(1);
  });
});

describe("validation helpers", () => {
  it("accepts Bengali text with Bengali digits and danda", () => {
    expect(isBanglaOnly("আজ ১২ই ফাল্গুন।")).toBe(true);
    expect(isBanglaOnly("দাম ১৫০ টাকা")).toBe(true);
  });

  it("rejects Latin letters and other scripts", () => {
    expect(isBanglaOnly("আমি Bengali লিখি")).toBe(false);
    expect(isBanglaOnly("क्ष")).toBe(false);
    expect(hasLatinLetters("আমি Bengali")).toBe(true);
    expect(hasLatinLetters("আমি বাংলা")).toBe(false);
  });
});
