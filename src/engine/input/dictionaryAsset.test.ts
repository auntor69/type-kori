/**
 * The shipped word list, held to its contract.
 *
 * The index is committed (`public/dictionary/bn.txt`) and served as a static
 * asset, so what the browser fetches is a build artifact nobody reviews by
 * reading. These tests read that exact file and assert the four things the
 * engine's behaviour depends on:
 *
 * 1. it is small — only corrections ship, never the whole word list;
 * 2. every entry is a correction, never a preference: the rules alone must not
 *    already produce one of its words;
 * 3. the engine answers each spelling with the entry's first word;
 * 4. every word it lists is reachable through its own spelling, and a word in the
 *    app's own content is never made impossible to type.
 *
 * Regenerate it with `bun run build:dictionary`; CI fails if it is out of date.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { targetWords } from "../../content/targetWords";
import { compileRules, loadGrammar, transliterate } from "./phonetic";
import {
  compileInverse,
  createWordDictionary,
  invertWord,
  isSpellableAlphabet,
  parseDictionary,
  romanKeys,
} from "./phoneticDictionary";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const asset = readFileSync(`${root}/public/dictionary/bn.txt`, "utf8");

const grammar = loadGrammar();
const compiled = compileRules(grammar);
const table = compileInverse(grammar);
const entries = parseDictionary(asset);
const dictionary = createWordDictionary(entries);
const options = { grammar, compiled, dictionary };
const ruledOnly = (roman: string) => transliterate(roman, { grammar, compiled });

describe("the shipped word list", () => {
  it("is a correction list, not the whole word list", () => {
    expect(entries.length).toBeGreaterThan(1000);
    // The full index is megabytes; what ships is a tenth of it. This is the guard
    // against shipping every spelling by accident.
    expect(Buffer.byteLength(asset, "utf8")).toBeLessThan(1024 * 1024);
  });

  it("uses one line per spelling, `roman word [word …]`", () => {
    for (const line of asset.trim().split("\n").slice(0, 500)) {
      const [roman, ...words] = line.split(" ");
      // The key is keystrokes, so it is printable and holds no space; the fields
      // after it are Bangla words the grammar can spell.
      expect(roman).toMatch(/^\S+$/);
      expect(words.length).toBeGreaterThan(0);
      for (const word of words) expect(isSpellableAlphabet(word), word).toBe(true);
    }
    // One spelling is one entry: the loader is a plain lookup, so a duplicate key
    // would mean a line the engine can never reach.
    expect(dictionary.size).toBe(entries.length);
  });

  it("only corrects spellings the rules get wrong", () => {
    const alreadySpelled: string[] = [];

    for (const entry of entries) {
      if (entry.words.includes(ruledOnly(entry.roman))) alreadySpelled.push(entry.roman);
    }

    // A spelling the rules already resolve to a real word is a preference between
    // two words, and the list has no frequency data to make that call with.
    expect(alreadySpelled).toEqual([]);
  });

  it("answers every spelling with the word the rules would have produced", () => {
    const wrong: string[] = [];

    for (const entry of entries) {
      if (transliterate(entry.roman, options) !== entry.words[0]) wrong.push(entry.roman);
    }

    expect(wrong).toEqual([]);
  });

  it("keeps every word it lists typeable", () => {
    const unreachable: string[] = [];

    for (const entry of entries) {
      for (const word of entry.words) {
        const canonical = romanKeys(word, table)[0];
        if (canonical === undefined || transliterate(canonical, options) !== word) {
          unreachable.push(word);
        }
      }
    }

    expect(unreachable).toEqual([]);
  });

  it("never makes a word in the app's own content impossible to type", () => {
    const targets = targetWords();
    expect(targets.size).toBeGreaterThan(100);

    const broken: string[] = [];
    for (const word of targets) {
      const canonical = invertWord(word, table);
      if (canonical === null || transliterate(canonical, options) !== word) broken.push(word);
    }

    expect(broken).toEqual([]);
  });
});
