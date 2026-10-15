/**
 * The hint, held to the whole vocabulary rather than a handful of examples.
 *
 * The on-screen keyboard is only useful if the key it highlights is the key that
 * gets the learner to the word in front of them, so that is asserted here by
 * *doing* it: from an empty buffer, follow the hint — always its first
 * suggestion — until the engine produces the target. Every word of the shipped
 * content and every word the shipped word list can correct has to arrive.
 *
 * Before this, the hint compared the engine's output for a half-typed buffer
 * against the target, which fails whenever a rule is longer than one key (`ng` is
 * ং, `T` is ট) or the render changes shape as it grows (`kem` renders as কেমো on
 * the way to কেমন): 134 of the app's 249 target words had at least one key the
 * hint refused to suggest.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { targetWords } from "../../content/targetWords";
import { compileRules, loadGrammar, transliterate } from "./phonetic";
import { createWordDictionary, parseDictionary } from "./phoneticDictionary";
import { characterFor, nextRomanKeys } from "./phoneticHint";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const entries = parseDictionary(readFileSync(`${root}/public/dictionary/bn.txt`, "utf8"));

const grammar = loadGrammar();
const compiled = compileRules(grammar);
const dictionary = createWordDictionary(entries);
const options = { grammar, compiled, dictionary };

/** Follow the hint from an empty buffer; return the keystrokes it produced. */
function walk(target: string): { buffer: string; produced: string } {
  let buffer = "";
  for (let step = 0; step < 40; step += 1) {
    const produced = transliterate(buffer, options);
    if (produced === target) break;
    const [key] = nextRomanKeys(buffer, target, options);
    if (key === undefined) break;
    const character = characterFor(key);
    if (character === null) break;
    buffer += character;
  }
  return { buffer, produced: transliterate(buffer, options) };
}

describe("the hint over the whole vocabulary", () => {
  it("spells every word of the shipped content, and only the shipped content", () => {
    const targets = [...targetWords()];
    expect(targets.length).toBeGreaterThan(200);

    const unreachable = targets.filter((word) => walk(word).produced !== word);
    if (unreachable.length > 0) {
      throw new Error(
        `${String(unreachable.length)} of ${String(targets.length)} target words could not be ` +
          `spelled from the hint, e.g. ` +
          unreachable
            .slice(0, 5)
            .map((word) => `${word} (${walk(word).buffer} → ${walk(word).produced})`)
            .join(", "),
      );
    }
  });

  it("spells every word the shipped word list can correct", () => {
    const words = [...new Set(entries.flatMap((entry) => entry.words))];
    expect(words.length).toBeGreaterThan(5000);

    const unreachable = words.filter((word) => walk(word).produced !== word);
    if (unreachable.length > 0) {
      throw new Error(
        `${String(unreachable.length)} of ${String(words.length)} words could not be spelled from ` +
          `the hint, e.g. ` +
          unreachable
            .slice(0, 5)
            .map((word) => `${word} (${walk(word).buffer} → ${walk(word).produced})`)
            .join(", "),
      );
    }
  });
});
