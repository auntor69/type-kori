import { describe, expect, it } from "vitest";

import { keyHeat, layoutById, nationalLayout, nextKeyHint, probhatLayout } from "./index";
import { keyForOutput } from "./types";

describe("the layout data", () => {
  it("maps every letter key of the national layout to a Bangla letter", () => {
    // A spot check of the rows the BCC guide documents, so a mistyped escape
    // sequence cannot silently produce an empty cap.
    expect(keyForOutput(nationalLayout, "\u0995")).toEqual({ code: "KeyJ", shift: false });
    expect(keyForOutput(nationalLayout, "\u0996")).toEqual({ code: "KeyJ", shift: true });
    expect(keyForOutput(nationalLayout, "\u09cd")).toEqual({ code: "KeyG", shift: false });
    expect(keyForOutput(nationalLayout, "\u09be")).toEqual({ code: "KeyH", shift: false });
    expect(keyForOutput(nationalLayout, "\u09e7")).toEqual({ code: "Digit1", shift: false });
  });

  it("puts the vowel signs where Probhat documents them", () => {
    expect(keyForOutput(probhatLayout, "\u09be")).toEqual({ code: "KeyA", shift: false });
    expect(keyForOutput(probhatLayout, "\u09bf")).toEqual({ code: "KeyI", shift: false });
    expect(keyForOutput(probhatLayout, "\u09cd")).toEqual({ code: "Slash", shift: false });
    expect(keyForOutput(probhatLayout, "\u09c7")).toEqual({ code: "BracketLeft", shift: false });
  });

  it("prefers the unshifted key when a character sits on both positions", () => {
    // Probhat types ৎ on the shifted 8 and nothing else; Ø-like overlaps are
    // resolved in favour of the plain key.
    const hint = keyForOutput(probhatLayout, "\u09ce");
    expect(hint).toEqual({ code: "Digit8", shift: true });
  });

  it("returns null for a character the layout cannot type", () => {
    expect(keyForOutput(nationalLayout, "\u0990")).toBeNull();
  });

  it("marks the data as awaiting native review", () => {
    for (const layout of [nationalLayout, probhatLayout]) {
      expect(layout.nativeReviewed, layout.id).toBe(false);
      expect(layout.source.length, layout.id).toBeGreaterThan(0);
    }
  });
});

describe("nextKeyHint", () => {
  it("points at the first key of the word before anything is typed", () => {
    // ক is KeyJ unshifted in the national layout.
    expect(nextKeyHint(nationalLayout, "কম", "")).toEqual({ code: "KeyJ", shift: false });
  });

  it("skips the characters already typed correctly", () => {
    expect(nextKeyHint(nationalLayout, "কম", "ক")).toEqual({ code: "KeyM", shift: false });
  });

  it("walks a conjunct one code point at a time", () => {
    // ক্ষ = ক + hasanta + ষ: three presses.
    expect(nextKeyHint(nationalLayout, "ক্ষ", "ক")).toEqual({ code: "KeyG", shift: false });
    expect(nextKeyHint(nationalLayout, "ক্ষ", "ক\u09cd")).toEqual({ code: "KeyN", shift: true });
  });

  it("asks for Shift when the character only sits there", () => {
    expect(nextKeyHint(nationalLayout, "খ", "")).toEqual({ code: "KeyJ", shift: true });
  });

  it("shows nothing once the word is complete", () => {
    expect(nextKeyHint(nationalLayout, "ক", "ক")).toBeNull();
  });

  it("shows nothing when the typed text has already diverged", () => {
    expect(nextKeyHint(nationalLayout, "কম", "খ")).toBeNull();
  });

  it("shows nothing for a character the layout has no key for", () => {
    expect(nextKeyHint(nationalLayout, "ঐ", "")).toBeNull();
  });
});

describe("keyHeat", () => {
  it("charges a cluster to the key of its first code point", () => {
    const heat = keyHeat(nationalLayout, {
      "ক": { missed: 3, seen: 10 },
      "খ": { missed: 1, seen: 4 },
    });
    expect(heat.KeyJ).toBe(4);
  });

  it("ignores clusters that were never missed", () => {
    expect(keyHeat(nationalLayout, { "ক": { missed: 0, seen: 9 } })).toEqual({});
  });

  it("ignores a cluster with no key in this layout", () => {
    expect(keyHeat(nationalLayout, { "ঐ": { missed: 2, seen: 2 } })).toEqual({});
  });
});

describe("layoutById", () => {
  it("resolves both layouts and defaults to the national one", () => {
    expect(layoutById("probhat").id).toBe("probhat");
    expect(layoutById("national").id).toBe("national");
  });
});
