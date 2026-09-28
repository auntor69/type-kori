/**
 * Input engines turn a key event into one action for the session reducer.
 *
 * The shape is deliberately smaller than a stateful engine: the session owns all
 * the run state, so an engine is a translator and stays trivial to test. An
 * engine that does own a Roman buffer (the phonetic one) reports the whole
 * current word through a `compose` action instead of appending, because the
 * converted text changes as more keys arrive.
 */

export type InputEngineId = "system" | "avro-phonetic";

export interface KeyInput {
  /** `KeyboardEvent.key` — for the system engine, whatever the OS produced. */
  key: string;
  /** `KeyboardEvent.code`, layout-independent, used by fixed layouts later. */
  code?: string;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  /** True while an OS input method is composing. */
  isComposing?: boolean;
}

export type IgnoreReason =
  | "composing"
  | "shortcut"
  | "function-key"
  | "empty"
  /** A Bangla character arrived from an installed keyboard while the built-in
   *  engine was on: the two would fight over the same keystrokes. */
  | "wrong-script";

export type EngineAction =
  /** Append to the word being typed (system keyboard mode). */
  | { type: "append"; text: string }
  /** Replace the whole word being typed (built-in phonetic mode). */
  | { type: "compose"; text: string; composing: string }
  | { type: "backspace" }
  | { type: "commit" }
  | { type: "ignore"; reason: IgnoreReason };

export interface InputEngine {
  readonly id: InputEngineId;
  /** True when the user must have a Bangla keyboard installed already. */
  readonly requiresInstalledKeyboard: boolean;
  translate(input: KeyInput): EngineAction;
  reset(): void;
}
