import type { InputEngineId } from "../engine/input/types";
import {
  FINGER_BY_CODE,
  layoutById,
  type Finger,
  type KeyboardLayout,
  type LayoutKey,
  type LayoutId,
} from "../engine/layouts";
import type { Lang } from "../i18n";

/**
 * The on-screen keyboard: which key to press next, coloured by the finger that
 * reaches it, and — once there is history — which keys have let the learner down.
 *
 * The whole board is `aria-hidden`: it mirrors the target text the typing area
 * already announces to a screen reader, so exposing it again would only add
 * noise. It is a visual aid, not a control.
 */

interface Props {
  mode: InputEngineId;
  /** Which fixed layout to draw when the system keyboard is in use. */
  layoutId: LayoutId;
  /** Key codes to highlight — the next key to press. */
  highlight: readonly string[];
  /** Miss counts per key, for the heat tint. */
  heat: Readonly<Record<string, number>>;
  /** The busiest key's count, so the tint scales to the learner's own worst key. */
  peak: number;
  /** Tint each key by the finger that reaches it. */
  fingerColors: boolean;
  /** Settings label, used as the region's accessible name. */
  label: string;
  lang: Lang;
}

/** A stable colour per finger, cool on the left hand and warm on the right. */
const FINGER_HUE: Record<Finger, number> = {
  "l-pinky": 265,
  "l-ring": 220,
  "l-middle": 190,
  "l-index": 165,
  thumb: 45,
  "r-index": 95,
  "r-middle": 30,
  "r-ring": 15,
  "r-pinky": 355,
};

function keyStyle(finger: Finger, heatRatio: number, fingerColors: boolean): Record<string, string> {
  // Heat is the one thing that always tints: it is the learner's own data. The
  // finger tint is a preference, and off means a plain key cap.
  if (heatRatio <= 0 && !fingerColors) return {};

  const hue = FINGER_HUE[finger];
  if (heatRatio <= 0) return { backgroundColor: `hsl(${hue} 70% 52% / 0.10)` };

  // Heat reads as the same finger colour, just stronger: a key that is missed
  // often looks warmer without inventing a second colour language.
  const alpha = 0.12 + heatRatio * 0.5;
  return { backgroundColor: `hsl(${hue} 78% 48% / ${alpha.toFixed(3)})` };
}

/** The Latin cap printed on a key when the layout has no printable output. */
function latinLabel(code: string): string {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter !== null) return letter[1].toLowerCase();
  const digit = /^Digit(\d)$/.exec(code);
  if (digit !== null) return digit[1];
  const named: Record<string, string> = {
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Space: "",
    Tab: "Tab",
    CapsLock: "Caps",
    Enter: "Enter",
    ShiftLeft: "Shift",
    ShiftRight: "Shift",
    Backspace: "\u232b",
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl",
    AltLeft: "Alt",
    AltRight: "Alt",
  };
  return named[code] ?? "";
}

const HIGHLIGHT_CLASS =
  "ring-2 ring-accent bg-accent-soft text-text shadow-[0_0_0_3px_var(--accent-soft)]";

const KEY_CLASS =
  "tk-key relative flex h-10 min-w-8 shrink-0 select-none items-center justify-center rounded-[6px] border border-border text-center leading-none text-muted sm:h-11";

/** One key of a fixed layout. */
function FixedKey({
  item,
  highlighted,
  heatRatio,
  fingerColors,
}: {
  item: LayoutKey;
  highlighted: boolean;
  heatRatio: number;
  fingerColors: boolean;
}) {
  const main = item.label ?? item.base;
  const sub = item.shiftLabel ?? item.shift;

  return (
    <span
      class={`${KEY_CLASS} ${highlighted ? HIGHLIGHT_CLASS : ""}`}
      style={{ ...keyStyle(item.finger, heatRatio, fingerColors), width: `${(item.width ?? 1) * 2.25}rem` }}
      data-state={highlighted ? "next" : undefined}
    >
      {main !== "" ? (
        <span lang="bn" class="font-bangla text-sm sm:text-base">
          {main}
        </span>
      ) : (
        <span class="text-[0.6rem] uppercase tracking-wide">{latinLabel(item.code)}</span>
      )}
      {sub !== undefined && sub !== "" && (
        <span lang="bn" class="font-bangla absolute start-1 top-0.5 text-[0.6rem] text-muted">
          {sub}
        </span>
      )}
    </span>
  );
}

/** One key of the Roman board used by built-in phonetic mode. */
function RomanKey({ code, highlighted, fingerColors }: { code: string; highlighted: boolean; fingerColors: boolean }) {
  const letter = latinLabel(code);
  const finger = FINGER_BY_CODE[code] ?? "l-index";
  return (
    <span
      class={`${KEY_CLASS} ${highlighted ? HIGHLIGHT_CLASS : ""}`}
      style={{ ...keyStyle(finger, 0, fingerColors), width: "2.25rem" }}
      data-state={highlighted ? "next" : undefined}
    >
      <span class="text-sm sm:text-base">{letter}</span>
    </span>
  );
}

/** The letter rows of a US keyboard, for built-in phonetic mode. */
const ROMAN_ROWS: readonly (readonly string[])[] = [
  "KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP".split(" "),
  "KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL".split(" "),
  "KeyZ KeyX KeyC KeyV KeyB KeyN KeyM".split(" "),
];

function board(
  layout: KeyboardLayout,
  highlight: Set<string>,
  heat: Readonly<Record<string, number>>,
  peak: number,
  fingerColors: boolean,
) {
  return layout.rows.map((row, rowIndex) => (
    <div key={rowIndex} class="flex justify-center gap-1">
      {row.keys.map((item) => (
        <FixedKey
          key={item.code}
          item={item}
          highlighted={highlight.has(item.code)}
          heatRatio={peak > 0 ? Math.min(1, (heat[item.code] ?? 0) / peak) : 0}
          fingerColors={fingerColors}
        />
      ))}
    </div>
  ));
}

export default function OnScreenKeyboard({
  mode,
  layoutId,
  highlight,
  heat,
  peak,
  fingerColors,
  label,
  lang,
}: Props) {
  const highlightSet = new Set(highlight);

  return (
    <div
      aria-hidden="true"
      lang={lang}
      data-tk-keyboard
      class="mt-6 hidden flex-col items-center gap-1 overflow-x-auto pb-1 md:flex"
      title={label}
    >
      {mode === "avro-phonetic"
        ? ROMAN_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} class="flex justify-center gap-1">
              {row.map((code) => (
                <RomanKey
                  key={code}
                  code={code}
                  highlighted={highlightSet.has(code)}
                  fingerColors={fingerColors}
                />
              ))}
            </div>
          ))
        : board(layoutById(layoutId), highlightSet, heat, peak, fingerColors)}
    </div>
  );
}
