/**
 * The on-screen keyboard, from the hint's side.
 *
 * A hint is only a hint if the key it names is on the board: whatever
 * `phoneticHint` can ask for has to have a key cap to land on, and Shift has to be
 * one of them, or a suggested `T` for ট is indistinguishable from `t` for ত.
 * That coupling is asserted here rather than assumed, because the two live in
 * different files and drift silently — the board used to be letters only, which
 * made every mark key and every shift state invisible.
 */

import { describe, expect, it } from "vitest";

import { romanBoardCodes } from "./OnScreenKeyboard";
import { loadGrammar } from "../engine/input/phonetic";
import { keypressFor } from "../engine/input/phoneticHint";

const board = new Set(romanBoardCodes());

/** Every character a Roman spelling can contain: the hint's whole alphabet. */
const TYPABLE = [
  ..."abcdefghijklmnopqrstuvwxyz",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ..."0123456789",
  ..."`^:;.,?!-",
];

describe("the Roman board", () => {
  it("draws a key for every character the hint can name", () => {
    const missing = TYPABLE.filter((character) => {
      const key = keypressFor(character);
      return key === null || !board.has(key.code);
    });

    expect(missing).toEqual([]);
  });

  it("draws the shift caps, so a shifted suggestion is visible", () => {
    expect(board.has("ShiftLeft")).toBe(true);
    expect(board.has("ShiftRight")).toBe(true);
  });

  it("draws the commit key the hint falls back to", () => {
    // Every finished word is answered with the space bar, so the bar has to be
    // on the board for that suggestion to be visible.
    expect(board.has("Space")).toBe(true);
  });

  it("covers the keys the grammar itself is written with", () => {
    const grammar = loadGrammar();
    const rows = [
      ...grammar.vowels.map((row) => row.latin),
      ...grammar.consonants.map((row) => row.latin),
      ...grammar.marks.map((row) => row.latin),
      ...grammar.conjuncts.map((row) => row.latin),
      ...grammar.digits.map((row) => row.latin),
      ...grammar.punctuation.map((row) => row.latin),
    ];

    const missing = new Set<string>();
    for (const latin of rows) {
      for (const character of latin) {
        const key = keypressFor(character);
        if (key === null || !board.has(key.code)) missing.add(`${character} (${latin})`);
      }
    }

    expect([...missing]).toEqual([]);
  });
});
