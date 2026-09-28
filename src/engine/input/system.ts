/**
 * System keyboard mode.
 *
 * The app does not convert anything: it reads the Unicode that the user's own
 * keyboard software produced and hands it to the same normalization and cluster
 * comparison the phonetic engine will use. Any installed layout therefore works,
 * and output is what gets judged — never the keystrokes that produced it.
 */

import { normalizeText } from "../unicode";
import type { EngineAction, InputEngine, KeyInput } from "./types";

export function createSystemEngine(): InputEngine {
  return {
    id: "system",
    requiresInstalledKeyboard: true,

    translate(input: KeyInput): EngineAction {
      if (input.isComposing === true) return { type: "ignore", reason: "composing" };
      if (input.ctrlKey || input.metaKey || input.altKey) {
        return { type: "ignore", reason: "shortcut" };
      }

      if (input.key === "Backspace") return { type: "backspace" };
      if (input.key === "Enter") return { type: "commit" };
      if (input.key === " ") return { type: "commit" };

      if (Array.from(input.key).length !== 1) {
        return { type: "ignore", reason: "function-key" };
      }

      return { type: "append", text: normalizeText(input.key) };
    },

    reset(): void {
      // Stateless: the session holds everything that can be reset.
    },
  };
}
