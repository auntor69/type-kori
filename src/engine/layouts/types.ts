/**
 * Fixed keyboard layouts: how a physical key maps to a Bangla character.
 *
 * A layout is data, never code, so a wrong row is a one-line fix and can be
 * listed in docs/VERIFY.md for a native speaker to check. The typing engine
 * judges output, not keystrokes (Section 3.4), so these layouts exist to *show*
 * the learner where a key is — they never change how a run is scored.
 *
 * Keys are identified by `KeyboardEvent.code` (layout-independent), never by the
 * character the OS would print, so the on-screen keyboard is correct no matter
 * what the user's own keyboard layout is.
 */

/** Which finger reaches a key, for the colour coding. */
export type Finger =
  | "l-pinky"
  | "l-ring"
  | "l-middle"
  | "l-index"
  | "thumb"
  | "r-index"
  | "r-middle"
  | "r-ring"
  | "r-pinky";

export type LayoutId = "national" | "probhat";

export interface LayoutKey {
  /** `KeyboardEvent.code`, e.g. `KeyA`, `Digit1`, `Semicolon`. */
  code: string;
  /** What the key produces unshifted. May be empty for a dead key. */
  base: string;
  /** What the key produces with Shift. Absent when it matches `base`. */
  shift?: string;
  finger: Finger;
  /**
   * What to print on the key cap when `base` is not itself a label (an invisible
   * joiner, a space). Falls back to `base`.
   */
  label?: string;
  /** Shifted label, when `shift` is not printable as-is. */
  shiftLabel?: string;
  /** How wide the cap is, in key units. Defaults to 1. */
  width?: number;
}

export interface KeyboardRow {
  keys: LayoutKey[];
}

export interface KeyboardLayout {
  id: LayoutId;
  /** Shown in the settings picker. */
  name: string;
  rows: KeyboardRow[];
  /**
   * The cluster-independent way to type a conjunct in this layout: the hasanta
   * character the layout produces, which is typed between the two consonants.
   */
  hasanta: string;
  /**
   * Where the layout's key data came from. Kept beside the data so a reviewer
   * knows what to check against.
   */
  source: string;
  /** True once a native speaker has checked every row. */
  nativeReviewed: boolean;
}

/** Every key of every row, flattened. */
export function allKeys(layout: KeyboardLayout): LayoutKey[] {
  return layout.rows.flatMap((row) => row.keys);
}

/** The output of a key for a given Shift state. `undefined` when there is none. */
export function outputFor(key: LayoutKey, shift: boolean): string | undefined {
  if (shift) return key.shift ?? key.base;
  return key.base;
}

/**
 * The key that produces an output, preferring the unshifted position: a learner
 * should be shown the plain key when one exists. A match on the shifted position
 * is returned with `shift: true`.
 */
export function keyForOutput(
  layout: KeyboardLayout,
  output: string,
): { code: string; shift: boolean } | null {
  if (output.length === 0) return null;

  for (const key of allKeys(layout)) {
    if (key.base === output) return { code: key.code, shift: false };
  }
  for (const key of allKeys(layout)) {
    if (key.shift === output) return { code: key.code, shift: true };
  }
  return null;
}
