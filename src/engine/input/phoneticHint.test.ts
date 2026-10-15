/**
 * The on-screen hint.
 *
 * The hint's promise is narrow and testable: every key it offers is a key that
 * keeps the target word reachable, including the ones a compatibility test
 * cannot see — `ng` for ং, `T` for ট, `^` for the candrabindu — it names the
 * commit key once the word is spelled, and it says nothing at all when it has
 * nothing honest to say.
 */

import { describe, expect, it } from "vitest";

import { loadGrammar, transliterate } from "./phonetic";
import type { WordDictionary } from "./phoneticDictionary";
import {
  characterFor,
  keypressFor,
  nextRomanKeys,
  romanKeyHint,
  spellingsFor,
  splitTarget,
} from "./phoneticHint";

const grammar = loadGrammar();
const options = { grammar };

/** A word list that knows one spelling the rules alone cannot produce. */
const stub: WordDictionary = {
  candidates: (roman) => (roman === "Da^Talo" ? ["ডাঁটালো"] : []),
  spellings: (word) => (word === "ডাঁটালো" ? ["Da^Talo"] : []),
  size: 1,
};

describe("the key a character is typed with", () => {
  it("maps letters, case included", () => {
    expect(keypressFor("k")).toEqual({ code: "KeyK", shift: false });
    // ট is `T` and ত is `t`, so the shift state is the difference between two letters.
    expect(keypressFor("T")).toEqual({ code: "KeyT", shift: true });
    expect(keypressFor("S")).toEqual({ code: "KeyS", shift: true });
  });

  it("maps the digits and the marks a Roman keyboard cannot print directly", () => {
    expect(keypressFor("5")).toEqual({ code: "Digit5", shift: false });
    expect(keypressFor("^")).toEqual({ code: "Digit6", shift: true });
    expect(keypressFor("`")).toEqual({ code: "Backquote", shift: false });
    expect(keypressFor(":")).toEqual({ code: "Semicolon", shift: true });
  });

  it("refuses a character the scheme has no key for", () => {
    expect(keypressFor("অ")).toBeNull();
    expect(keypressFor("€")).toBeNull();
  });

  it("round-trips through the character it produces", () => {
    for (const character of ["a", "Z", "7", "^", "`", ":"]) {
      expect(characterFor(keypressFor(character) as never)).toBe(character);
    }
  });
});

describe("a target token", () => {
  it("splits into the word and the punctuation that trails it", () => {
    expect(splitTarget("কথা।")).toEqual({ word: "কথা", trailing: "।" });
    expect(splitTarget("২০২৬")).toEqual({ word: "২০২৬", trailing: "" });
    expect(splitTarget("বাংলা,")).toEqual({ word: "বাংলা", trailing: "," });
    expect(splitTarget("বাংলা")).toEqual({ word: "বাংলা", trailing: "" });
  });
});

describe("the spellings a word can be typed with", () => {
  it("finds the rules' own inverse for a word the rules spell", () => {
    expect(spellingsFor("কাল", options)).toContain("kal");
    expect(spellingsFor("বাংলা", options)).toContain("bangla");
  });

  it("offers both the canonical and the relaxed final o-kar when both work", () => {
    // কেমন is typeable as `kemon` (the inverse) and as `kemono`, so both are
    // offered; ভালো is not typeable as `valo`, which the rules read as ভাল.
    expect(spellingsFor("কেমন", options)).toContain("kemon");
    expect(spellingsFor("ভালো", options)).toEqual(["valO"]);
  });

  it("keeps a spelling whose last key is not a letter", () => {
    // সহরৎ ends in the khanda ta, typed `t`` ` — a spelling the word list could
    // never hold as a key, and one a hint about keystrokes has to offer.
    expect(spellingsFor("সহরৎ", options)).toContain("sohorot``");
  });

  it("adds the word list's spelling to the rules' own", () => {
    expect(spellingsFor("ডাঁটালো", { ...options, dictionary: stub })).toContain("Da^Talo");
    expect(spellingsFor("ডাঁটালো", options)).not.toContain("Da^Talo");
  });

  it("promises nothing for an unspellable token", () => {
    expect(spellingsFor("hello", options)).toEqual([]);
    expect(spellingsFor("", options)).toEqual([]);
  });
});

describe("the next key to press", () => {
  it("starts a word at its first key, shift included", () => {
    // Taka would be wrong: ট is the capital key and ত the lowercase one.
    expect(nextRomanKeys("", "টাকা", options)).toEqual([{ code: "KeyT", shift: true }]);
    expect(nextRomanKeys("", "কাল", options)).toEqual([{ code: "KeyK", shift: false }]);
  });

  it("follows a two-key rule: ং is `ng`", () => {
    // The engine renders `ban` as বান on the way to বাংলা, so a hint that judged
    // the rendered output would refuse `n` here. It is the correct key.
    expect(nextRomanKeys("ba", "বাংলা", options)).toEqual([{ code: "KeyN", shift: false }]);
    expect(nextRomanKeys("ban", "বাংলা", options)).toEqual([{ code: "KeyG", shift: false }]);
    expect(nextRomanKeys("bang", "বাংলা", options)).toEqual([{ code: "KeyL", shift: false }]);
  });

  it("follows a mid-word inherent vowel: `koro` on the way to করছেন", () => {
    expect(nextRomanKeys("kor", "করছেন", options).map((key) => key.code)).toContain("KeyO");
  });

  it("offers the mark keys the scheme needs", () => {
    // The candrabindu sits on Shift+6 and the hasanta on the backquote.
    expect(nextRomanKeys("Da", "ডাঁটালো", { ...options, dictionary: stub })).toEqual([
      { code: "Digit6", shift: true },
    ]);
    expect(nextRomanKeys("ha^", "হাঁটতে", options)).toEqual([{ code: "KeyT", shift: true }]);
    // সহরৎ is spelled `sohorot`` `: the last two keys are the khanda ta's.
    expect(nextRomanKeys("sohorot", "সহরৎ", options)).toEqual([
      { code: "Backquote", shift: false },
    ]);
  });

  it("walks punctuation after the word", () => {
    expect(nextRomanKeys("kotha", "কথা।", options)).toEqual([{ code: "Period", shift: false }]);
  });

  it("hints the digits of a numeral", () => {
    expect(nextRomanKeys("", "২০২৬", options)).toEqual([{ code: "Digit2", shift: false }]);
    expect(nextRomanKeys("202", "২০২৬", options)).toEqual([{ code: "Digit6", shift: false }]);
  });

  it("names the commit key once the word is spelled", () => {
    // A finished word is not the end of the hint's usefulness: the next
    // keystroke is what commits it, and that key is the space bar.
    expect(nextRomanKeys("kal", "কাল", options)).toEqual([{ code: "Space", shift: false }]);
    expect(nextRomanKeys("gelo", "গেলো", options)).toEqual([{ code: "Space", shift: false }]);
    // The word and its trailing punctuation are both typed before that.
    expect(nextRomanKeys("kotha.", "কথা।", options)).toEqual([{ code: "Space", shift: false }]);
  });

  it("says nothing when the buffer is not on the way to the word", () => {
    // A wrong turn is the session's to point out, and a hint that guessed would
    // have to guess wrong to say anything here.
    expect(nextRomanKeys("kh", "কাল", options)).toEqual([]);
    expect(nextRomanKeys("ka", "kal", options)).toEqual([]);
    expect(nextRomanKeys("", "", options)).toEqual([]);
  });

  it("keeps the codes for the caller that only wants highlights", () => {
    expect(romanKeyHint("", "কাল", options)).toEqual(["KeyK"]);
    expect(romanKeyHint("gel", "গেলো", options)).toContain("KeyO");
  });

  it("only ever suggests a key that keeps the word reachable", () => {
    // The property, stated once: following the hint from an empty buffer spells
    // the word it was asked about.
    for (const word of ["কাল", "বাংলা", "টাকা", "গেলো", "সহরৎ", "পরিষ্কার", "২০২৬"]) {
      let buffer = "";
      for (let step = 0; step < 20 && transliterate(buffer, options) !== word; step += 1) {
        const [key] = nextRomanKeys(buffer, word, options);
        expect(key, `${word} ran out of hints at ${buffer}`).toBeDefined();
        buffer += characterFor(key as never) as string;
      }
      expect(transliterate(buffer, options), `${word} via ${buffer}`).toBe(word);
    }
  });
});
