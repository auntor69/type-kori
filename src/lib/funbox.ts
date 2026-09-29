/**
 * Funbox modes: optional twists applied to the generated word stream.
 *
 * Every mode is a pure transform of the words the practice island just drew, so
 * the same run seed always produces the same text and a mode can be unit tested
 * without a browser. Nothing here needs new content — the twists transform the
 * curated vocabulary, which is why they can exist in a Bangla-only app without
 * inventing text that no native speaker has reviewed.
 */

import type { Rng } from "../engine/text/provider";
import { splitClusters } from "../engine/unicode";

export type FunboxMode = "none" | "numbers" | "punctuation" | "backwards" | "memory";

export const funboxModes: readonly FunboxMode[] = [
  "none",
  "numbers",
  "punctuation",
  "backwards",
  "memory",
];

export function isFunboxMode(value: unknown): value is FunboxMode {
  return typeof value === "string" && (funboxModes as readonly string[]).includes(value);
}

/** Bengali digits, so "numbers" mode stays inside what the app already types. */
const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

function bengaliNumber(rng: Rng, digits: number): string {
  let out = "";
  for (let index = 0; index < digits; index += 1) {
    const digit = BENGALI_DIGITS[Math.floor(rng() * 10)] ?? "০";
    // A leading zero would read as a different number, not a longer one.
    out += index === 0 && digit === "০" ? "১" : digit;
  }
  return out;
}

/** The marks a Bangla sentence actually uses. */
const PUNCTUATION = ["।", "।", ",", "—", "—", "!"] as const;
const OPENING = ["“", "‘"] as const;
const CLOSING = ["”", "’"] as const;

/**
 * Apply a funbox mode to a freshly drawn line of words. `memory` returns the
 * words untouched: it changes how much of the line is *shown*, which is a
 * rendering decision, not a text one.
 */
export function applyFunbox(
  words: readonly string[],
  mode: FunboxMode,
  rng: Rng,
): string[] {
  switch (mode) {
    case "none":
    case "memory":
      return [...words];

    case "numbers":
      return words.map((word, index) => {
        // Roughly every fourth word becomes a number, so the digits arrive
        // often enough to practise but never take over the line.
        if (index % 4 !== 1) return word;
        return bengaliNumber(rng, 2 + Math.floor(rng() * 3));
      });

    case "punctuation":
      return words.map((word, index) => {
        const roll = rng();
        if (index === words.length - 1 && roll < 0.6) return `${word}।`;
        if (roll < 0.28) return `${word}।`;
        if (roll < 0.42) return `${word},`;
        if (roll < 0.52) return `${word}—`;
        if (roll < 0.58) {
          const open = OPENING[Math.floor(rng() * OPENING.length)] ?? "“";
          const close = CLOSING[Math.floor(rng() * CLOSING.length)] ?? "”";
          return `${open}${word}${close}`;
        }
        if (roll < 0.62) return `${word}!`;
        return word;
      });

    case "backwards":
      // Reverse cluster order, not code points: an abugida read right to left
      // would tear a conjunct apart, and the target would no longer be typable.
      return words.map((word) => splitClusters(word).reverse().join(""));

    default:
      return [...words];
  }
}
