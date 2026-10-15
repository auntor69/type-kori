/**
 * The national Bangla keyboard, BDS 1738 (the "Jatiya" layout).
 *
 * Letter and digit rows are taken from the BCC's 2006 user guide for the
 * four-level national keyboard (BDS 1738:2004). Conjuncts are typed the standard
 * way: consonant, hasanta, consonant. The 2018 revision of the standard is
 * reported to be Bijoy-derived and is a different layout; this file is the older
 * Jatiya mapping that the guide documents.
 *
 * Every row is marked `nativeReviewed: false` until a native speaker checks it
 * against a real keyboard, and the punctuation keys the guide did not document
 * are recorded in docs/VERIFY.md rather than guessed.
 */

import type { KeyboardLayout, LayoutKey } from "./types";

const key = (
  code: string,
  base: string,
  finger: LayoutKey["finger"],
  shift?: string,
  width?: number,
): LayoutKey => ({ code, base, finger, ...(shift === undefined ? {} : { shift }), ...(width === undefined ? {} : { width }) });

export const nationalLayout: KeyboardLayout = {
  id: "national",
  name: "National (BDS 1738)",
  hasanta: "\u09cd",
  source: "BCC National Keyboard user guide (2006), BDS 1738:2004",
  nativeReviewed: false,
  rows: [
    {
      keys: [
        key("Backquote", "", "l-pinky", "", undefined),
        key("Digit1", "\u09e7", "l-pinky"),
        key("Digit2", "\u09e8", "l-ring"),
        key("Digit3", "\u09e9", "l-middle"),
        key("Digit4", "\u09ea", "l-index"),
        key("Digit5", "\u09eb", "l-index"),
        key("Digit6", "\u09ec", "r-index"),
        key("Digit7", "\u09ed", "r-index"),
        key("Digit8", "\u09ee", "r-middle"),
        key("Digit9", "\u09ef", "r-ring"),
        key("Digit0", "\u09e6", "r-pinky"),
        key("Minus", "", "r-pinky"),
        key("Equal", "", "r-pinky"),
        key("Backspace", "", "r-pinky", undefined, 2),
      ],
    },
    {
      keys: [
        key("Tab", "", "l-pinky", undefined, 1.5),
        key("KeyQ", "\u0999", "l-pinky", "\u0982"),
        key("KeyW", "\u09af", "l-ring", "\u09df"),
        key("KeyE", "\u09a1", "l-middle", "\u09a2"),
        key("KeyR", "\u09aa", "l-index", "\u09ab"),
        key("KeyT", "\u099f", "l-index", "\u09a0"),
        key("KeyY", "\u099a", "r-index", "\u099b"),
        key("KeyU", "\u099c", "r-index", "\u099d"),
        key("KeyI", "\u09b9", "r-middle", "\u099e"),
        key("KeyO", "\u0997", "r-ring", "\u0998"),
        key("KeyP", "\u09dc", "r-pinky", "\u09dd"),
        key("BracketLeft", "", "r-pinky"),
        key("BracketRight", "", "r-pinky"),
        key("Backslash", "", "r-pinky", undefined, 1.5),
      ],
    },
    {
      keys: [
        key("CapsLock", "", "l-pinky", undefined, 1.75),
        key("KeyA", "\u09c3", "l-pinky", "\u09d7"),
        key("KeyS", "\u09c1", "l-ring", "\u09c2"),
        key("KeyD", "\u09bf", "l-middle", "\u09c0"),
        key("KeyF", "\u09ac", "l-index", "\u09ad"),
        key("KeyG", "\u09cd", "l-index", "\u0964"),
        key("KeyH", "\u09be", "r-index", "\u0985"),
        key("KeyJ", "\u0995", "r-index", "\u0996"),
        key("KeyK", "\u09a4", "r-middle", "\u09a5"),
        key("KeyL", "\u09a6", "r-ring", "\u09a7"),
        key("Semicolon", "", "r-pinky"),
        key("Quote", "", "r-pinky"),
        key("Enter", "", "r-pinky", undefined, 2.25),
      ],
    },
    {
      keys: [
        key("ShiftLeft", "", "l-pinky", undefined, 2.25),
        key("KeyZ", "\u0981", "l-pinky", "\u0983"),
        key("KeyX", "\u09cb", "l-ring", "\u09cc"),
        key("KeyC", "\u09c7", "l-middle", "\u09c8"),
        key("KeyV", "\u09b0", "l-index", "\u09b2"),
        key("KeyB", "\u09a8", "l-index", "\u09a3"),
        key("KeyN", "\u09b8", "r-index", "\u09b7"),
        key("KeyM", "\u09ae", "r-index", "\u09b6"),
        key("Comma", "", "r-middle"),
        key("Period", "", "r-ring"),
        key("Slash", "", "r-pinky"),
        key("ShiftRight", "", "r-pinky", undefined, 2.75),
      ],
    },
    {
      keys: [
        key("ControlLeft", "", "l-pinky", undefined, 1.25),
        key("AltLeft", "", "l-pinky", undefined, 1.25),
        key("Space", " ", "thumb", undefined, 6.25),
        key("AltRight", "", "r-pinky", undefined, 1.25),
        key("ControlRight", "", "r-pinky", undefined, 1.25),
      ],
    },
  ],
};
