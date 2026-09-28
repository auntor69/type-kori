/**
 * Input engines turn a key event into one action for the session reducer.
 *
 * The shape is deliberately smaller than a stateful engine: the session owns all
 * state, so an engine is a pure translator and stays trivial to test. The
 * phonetic engine (built-in mode) will report its Roman buffer through the
 * optional `composing` field rather than holding state of its own.
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

export type EngineAction =
  | { type: "append"; text: string; composing?: string }
  | { type: "backspace" }
  | { type: "commit" }
  | { type: "ignore"; reason: "composing" | "shortcut" | "function-key" | "empty" };

export interface InputEngine {
  readonly id: InputEngineId;
  /** True when the user must have a Bangla keyboard installed already. */
  readonly requiresInstalledKeyboard: boolean;
  translate(input: KeyInput): EngineAction;
  reset(): void;
}
