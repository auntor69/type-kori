/**
 * The Probhat Bangla layout (প্রভাত), the free fixed layout by Ekushey that Avro
 * Keyboard also ships.
 *
 * Unlike the national layout, Probhat puts the vowel signs on the top and right
 * rows and the full vowel letters next to their signs, so a learner meets a
 * letter and its sign on neighbouring keys. Conjuncts are typed as consonant,
 * hasanta (`/`), consonant. Rows are marked `nativeReviewed: false` for a native
 * speaker to confirm.
 */

import type { LayoutKey, KeyboardLayout } from "./types";

const key = (
  code: string,
  base: string,
  finger: LayoutKey["finger"],
  shift?: string,
  width?: number,
): LayoutKey => ({ code, base, finger, ...(shift === undefined ? {} : { shift }), ...(width === undefined ? {} : { width }) });

export const probhatLayout: KeyboardLayout = {
  id: "probhat",
  name: "Probhat",
  hasanta: "\u09cd",
  source: "Probhat key tables (Bangla Wikipedia; easybengalityping), Ubuntu XKB lineage",
  nativeReviewed: false,
  rows: [
    {
      keys: [
        // The backtick is ZWJ, which prints as nothing; label it so the cap is
        // not an empty hole.
        { code: "Backquote", base: "\u200d", finger: "l-pinky", label: "ZWJ" },
        key("Digit1", "\u09e7", "l-pinky"),
        key("Digit2", "\u09e8", "l-ring"),
        key("Digit3", "\u09e9", "l-middle"),
        key("Digit4", "\u09ea", "l-index", "\u09f3"),
        key("Digit5", "\u09eb", "l-index"),
        key("Digit6", "\u09ec", "r-index"),
        key("Digit7", "\u09ed", "r-index", "\u099e"),
        key("Digit8", "\u09ee", "r-middle", "\u09ce"),
        key("Digit9", "\u09ef", "r-ring"),
        key("Digit0", "\u09e6", "r-pinky"),
        key("Minus", "-", "r-pinky"),
        key("Equal", "=", "r-pinky"),
        key("Backspace", "", "r-pinky", undefined, 2),
      ],
    },
    {
      keys: [
        key("Tab", "", "l-pinky", undefined, 1.5),
        key("KeyQ", "\u09a6", "l-pinky", "\u09a7"),
        key("KeyW", "\u09c2", "l-ring", "\u098a"),
        key("KeyE", "\u09c0", "l-middle", "\u0988"),
        key("KeyR", "\u09b0", "l-index", "\u09dc"),
        key("KeyT", "\u099f", "l-index", "\u09a0"),
        key("KeyY", "\u098f", "r-index", "\u0990"),
        key("KeyU", "\u09c1", "r-index", "\u0989"),
        key("KeyI", "\u09bf", "r-middle", "\u0987"),
        key("KeyO", "\u0993", "r-ring", "\u0994"),
        key("KeyP", "\u09aa", "r-pinky", "\u09ab"),
        key("BracketLeft", "\u09c7", "r-pinky", "\u09c8"),
        key("BracketRight", "\u09cb", "r-pinky", "\u09cc"),
        {
          code: "Backslash",
          base: "\u200c",
          shift: "\u0965",
          finger: "r-pinky",
          label: "ZWNJ",
          width: 1.5,
        },
      ],
    },
    {
      keys: [
        key("CapsLock", "", "l-pinky", undefined, 1.75),
        key("KeyA", "\u09be", "l-pinky", "\u0985"),
        key("KeyS", "\u09b8", "l-ring", "\u09b7"),
        key("KeyD", "\u09a1", "l-middle", "\u09a2"),
        key("KeyF", "\u09a4", "l-index", "\u09a5"),
        key("KeyG", "\u0997", "l-index", "\u0998"),
        key("KeyH", "\u09b9", "r-index", "\u0983"),
        key("KeyJ", "\u099c", "r-index", "\u099d"),
        key("KeyK", "\u0995", "r-middle", "\u0996"),
        key("KeyL", "\u09b2", "r-ring", "\u0982"),
        key("Semicolon", ";", "r-pinky"),
        key("Quote", "'", "r-pinky"),
        key("Enter", "", "r-pinky", undefined, 2.25),
      ],
    },
    {
      keys: [
        key("ShiftLeft", "", "l-pinky", undefined, 2.25),
        key("KeyZ", "\u09df", "l-pinky", "\u09af"),
        key("KeyX", "\u09b6", "l-ring", "\u09dd"),
        key("KeyC", "\u099a", "l-middle", "\u099b"),
        key("KeyV", "\u0986", "l-index", "\u098b"),
        key("KeyB", "\u09ac", "l-index", "\u09ad"),
        key("KeyN", "\u09a8", "r-index", "\u09a3"),
        key("KeyM", "\u09ae", "r-index", "\u0999"),
        key("Comma", ",", "r-middle", "\u09c3"),
        key("Period", "\u0964", "r-ring", "\u0981"),
        key("Slash", "\u09cd", "r-pinky", "?"),
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
