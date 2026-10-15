/**
 * Every word the app asks a learner to type.
 *
 * The trainer's own targets are the one word set that must stay typeable: if the
 * phonetic engine cannot produce a target's Bangla from any Roman spelling, the
 * drill is impossible and the site is asking for something its own tool cannot
 * do. So the word list the engine consults treats these as words whether or not
 * it has ever heard of them (see `scripts/build-dictionary.ts`), and the shipped
 * index is held to it by a test.
 *
 * A token can carry sentence punctuation (`কথা।`), which is not part of the word,
 * so a trailing run of anything outside the Bengali block is trimmed. Only the
 * tail: a Bangla word may end in a sign (`কি`, `কো`) or a hasanta (`সহরৎ`).
 */

import drills from "../../content/lessons/drills.json";
import { practiceTexts } from "./texts";
import { splitWords } from "../engine/unicode";
import { isSpellableAlphabet } from "../engine/input/phoneticDictionary";

/** Is this character inside the Bengali block, or a joiner between two of them? */
function isBengali(character: string): boolean {
  const point = character.codePointAt(0) ?? 0;
  return point === 0x200c || point === 0x200d || (point >= 0x0980 && point <= 0x09ff);
}

/** The word part of a token, with any sentence punctuation trimmed off. */
export function bareWord(token: string): string {
  let end = token.length;
  while (end > 0 && !isBengali(token[end - 1] as string)) end -= 1;
  return token.slice(0, end);
}

/** The target words of every shipped practice text and lesson drill. */
export function targetWords(): Set<string> {
  const words = new Set<string>();
  const texts = [...practiceTexts.map((text) => text.text), ...drills.map((drill) => drill.text)];

  for (const text of texts) {
    for (const token of splitWords(text)) {
      const word = bareWord(token);
      if (word !== "" && isSpellableAlphabet(word)) words.add(word);
    }
  }

  return words;
}
