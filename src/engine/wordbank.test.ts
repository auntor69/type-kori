import { describe, expect, it } from "vitest";

import { createWordBank, drawWords } from "./wordbank";

const SOURCES = [
  "বাংলা ভাষা আমার ভালো বাংলা",
  "টাইপিং শেখা সহজ ভাষা টাইপিং",
  "অনুশীলন করা দরকার ভালো অনুশীলন",
];

describe("createWordBank", () => {
  it("collects unique words and their frequencies", () => {
    const bank = createWordBank(SOURCES);

    expect(bank.words).toContain("বাংলা");
    expect(bank.words).not.toContain("বাংলা ভাষা");
    // বাংলা appears twice, so it outweighs a once-seen word.
    const bangla = bank.words.indexOf("বাংলা");
    const amar = bank.words.indexOf("আমার");
    expect(bank.weights[bangla]).toBeGreaterThan(bank.weights[amar]);
  });
});

describe("drawWords", () => {
  it("is deterministic for a seed", () => {
    const bank = createWordBank(SOURCES);
    expect(drawWords(bank, 8, 42)).toEqual(drawWords(bank, 8, 42));
    expect(drawWords(bank, 8, 42)).not.toEqual(drawWords(bank, 8, 43));
  });

  it("returns exactly the requested count", () => {
    const bank = createWordBank(SOURCES);
    expect(drawWords(bank, 50, 7)).toHaveLength(50);
  });

  it("never repeats a word back to back", () => {
    const bank = createWordBank(SOURCES);
    const words = drawWords(bank, 30, 9);

    for (let index = 1; index < words.length; index += 1) {
      expect(words[index]).not.toBe(words[index - 1]);
    }
  });
});
