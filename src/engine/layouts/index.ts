/**
 * The keyboard-layout registry and the two things a learner needs from a
 * layout: which key to press next, and how often each key has let them down.
 *
 * Both are pure functions of stored data, so the on-screen keyboard is added
 * without touching the scoring engine: the layout informs the eye, while the
 * engine still judges output (Section 3.4).
 */

import type { ErrorMap } from "../../lib/progress";
import { splitClusters } from "../unicode";
import { nationalLayout } from "./national";
import { probhatLayout } from "./probhat";
import { allKeys, keyForOutput, type Finger, type KeyboardLayout, type LayoutId } from "./types";

export { nationalLayout, probhatLayout };
export * from "./types";

export const layouts: readonly KeyboardLayout[] = [nationalLayout, probhatLayout];

/**
 * The finger that reaches each physical key. Touch typing is a property of the
 * keyboard, not of a layout, so one canonical map serves the fixed boards and
 * the Roman board alike.
 */
export const FINGER_BY_CODE: Readonly<Record<string, Finger>> = Object.fromEntries(
  allKeys(nationalLayout).map((item) => [item.code, item.finger]),
);

export function layoutById(id: LayoutId): KeyboardLayout {
  return layouts.find((layout) => layout.id === id) ?? nationalLayout;
}

/** Shift state plus the physical key the next keystroke should land on. */
export interface KeyHint {
  code: string;
  shift: boolean;
}

/**
 * Which key produces the next character of `targetWord`, given what has been
 * typed so far.
 *
 * Comparison is by code point, because that is exactly what a fixed layout
 * produces: one press, one code point. A conjunct is therefore walked one press
 * at a time — ক, then hasanta, then the second consonant — which is also how the
 * learner has to type it. Returns null when the next character has no key in this
 * layout, or when the typed text has already diverged (a hint for a word the user
 * is no longer typing would be a lie).
 */
export function nextKeyHint(
  layout: KeyboardLayout,
  targetWord: string,
  typedWord: string,
): KeyHint | null {
  const target = Array.from(targetWord.normalize("NFC"));
  const typed = Array.from(typedWord.normalize("NFC"));

  if (typed.length > target.length) return null;
  for (let index = 0; index < typed.length; index += 1) {
    if (typed[index] !== target[index]) return null;
  }

  const next = target[typed.length];
  if (next === undefined) return null;

  return keyForOutput(layout, next);
}

/**
 * Miss counts charged to physical keys, for the heat overlay on the on-screen
 * keyboard. A cluster is charged to the key that starts it; a conjunct's hasanta
 * and second consonant are not charged separately, because the user's own error
 * map counts the whole cluster as one miss.
 */
export function keyHeat(layout: KeyboardLayout, errorMap: Readonly<ErrorMap>): Record<string, number> {
  const heat: Record<string, number> = {};

  for (const [cluster, stat] of Object.entries(errorMap)) {
    if (stat.missed <= 0) continue;
    const first = splitClusters(cluster)[0];
    if (first === undefined) continue;
    const hint = keyForOutput(layout, first);
    if (hint === null) continue;
    heat[hint.code] = (heat[hint.code] ?? 0) + stat.missed;
  }

  return heat;
}

/** The busiest heat value on the keyboard, so the overlay can scale to it. */
export function peakHeat(heat: Readonly<Record<string, number>>): number {
  return Object.values(heat).reduce((peak, value) => Math.max(peak, value), 0);
}
