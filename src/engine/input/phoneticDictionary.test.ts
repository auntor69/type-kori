/**
 * The build side of the word list: turning words into the index the engine reads.
 *
 * Three properties are load-bearing, and each one is a test rather than a
 * comment:
 *
 * - a word is kept only when the grammar can spell it back, so the list can never
 *   promise a word the engine cannot type;
 * - two words behind one spelling are one entry, which is the whole reason a list
 *   exists next to a rule table;
 * - the word a spelling inverts to comes first, so every listed word stays
 *   reachable through its own spelling.
 */

import { describe, expect, it } from "vitest";

import { compileRules, loadGrammar, splitTrailingPunctuation, transliterate } from "./phonetic";
import {
  buildDictionary,
  compileInverse,
  createWordDictionary,
  EMPTY_DICTIONARY,
  invertWord,
  isSpellableAlphabet,
  isTypeable,
  parseDictionary,
  romanKeys,
  serializeDictionary,
} from "./phoneticDictionary";

const grammar = loadGrammar();
const compiled = compileRules(grammar);
const table = compileInverse(grammar);

/** The index a word list builds, ready for the engine. */
const indexOf = (words: string[]) => createWordDictionary(buildDictionary(words, grammar).entries);

describe("the source word list", () => {
  it("takes the Bengali block and refuses anything a Roman keyboard cannot spell", () => {
    expect(isSpellableAlphabet("কেমন")).toBe(true);
    expect(isSpellableAlphabet("সহরৎ")).toBe(true);
    expect(isSpellableAlphabet("কথা।")).toBe(false);
    expect(isSpellableAlphabet("৫")).toBe(false);
    expect(isSpellableAlphabet("hello")).toBe(false);
  });

  it("inverts a word into keystrokes a learner could actually press", () => {
    // The inherent vowel is left unwritten at the end of a word, so the inverse of
    // কেমন is `kemon` and not `kemono`.
    expect(invertWord("কেমন", table)).toBe("kemon");
    // A final o-kar is a sign, so it is spelled with the capital key, and the
    // relaxed form a learner is likely to write comes with it.
    expect(romanKeys("ভালো", table)).toEqual(["valO", "valo"]);
  });

  it("gives a word ending in khanda ta no dictionary key", () => {
    // The engine strips trailing punctuation before it looks a spelling up, so a
    // key ending in the khanda-ta backticks could never be found. Such a word stays
    // typeable through the rules and ships no entry rather than a dead one.
    const canonical = invertWord("সহরৎ", table) as string;

    expect(splitTrailingPunctuation(canonical)[0]).not.toBe(canonical);
    expect(transliterate(canonical, { grammar, compiled })).toBe("সহরৎ");
    expect(romanKeys("সহরৎ", table)).toEqual([]);
  });

  it("only calls a word typeable when the rules spell it back", () => {
    expect(isTypeable("কেমন", table, grammar)).toBe(true);
    expect(isTypeable("কথা।", table, grammar)).toBe(false);
  });
});

describe("the built index", () => {
  it("keeps the words the grammar can spell and drops the rest", () => {
    const { words, stats } = buildDictionary(["কেমন", "hello", "কথা।", "কেমন"], grammar);

    expect(words).toContain("কেমন");
    expect(words).not.toContain("hello");
    expect(words).not.toContain("কথা।");
    // A repeated word is one word.
    expect(words.filter((word) => word === "কেমন")).toHaveLength(1);
    expect(stats.input).toBe(4);
  });

  it("answers every spelling with the word whose spelling it is", () => {
    // Two words can share a spelling: the relaxed o-kar form of one (`kro` for
    // ক্রো) is the same string as the plain form of another (ক্র). The word the
    // spelling belongs to has to win, or it stops being typeable at all.
    const { entries } = buildDictionary(["ঢক", "ঢোক", "ক্র", "ক্রো"], grammar);
    const dictionary = createWordDictionary(entries);
    const options = { grammar, compiled, dictionary };
    const shared = entries.filter((entry) => entry.words.length > 1);

    expect(shared.length).toBeGreaterThan(0);
    for (const entry of shared) {
      const owner = entry.words.find((word) => romanKeys(word, table)[0] === entry.roman);
      expect(owner, `${entry.roman} needs an owner`).toBeDefined();
      expect(transliterate(entry.roman, options), entry.roman).toBe(owner);
    }
  });

  it("keeps every word it lists typeable", () => {
    const words = ["কেমন", "ভালো", "ঢক", "ঢোক", "ঢোকান", "ঢোকানো", "সহরৎ"];
    const dictionary = indexOf(words);
    const options = { grammar, compiled, dictionary };
    const unreachable: string[] = [];

    for (const word of buildDictionary(words, grammar).words) {
      const canonical = invertWord(word, table);
      if (canonical === null || transliterate(canonical, options) !== word) {
        unreachable.push(word);
      }
    }

    expect(unreachable).toEqual([]);
  });

  it("round-trips through the asset format", () => {
    const { entries } = buildDictionary(["কেমন", "ভালো", "ঢোকান", "ঢোকানো"], grammar);
    expect(parseDictionary(serializeDictionary(entries))).toEqual(entries);
  });

  it("drops a malformed line rather than throwing over the whole asset", () => {
    const entries = parseDictionary("kemon কেমন\nbroken\n\nbhalo ভালো\n");

    expect(entries).toEqual([
      { roman: "kemon", words: ["কেমন"] },
      { roman: "bhalo", words: ["ভালো"] },
    ]);
    expect(createWordDictionary(entries).candidates("broken")).toEqual([]);
  });

  it("has an empty dictionary that changes nothing", () => {
    expect(EMPTY_DICTIONARY.size).toBe(0);
    expect(EMPTY_DICTIONARY.candidates("kemon")).toEqual([]);
  });
});
