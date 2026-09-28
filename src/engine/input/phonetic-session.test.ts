import { describe, expect, it } from "vitest";

import { renderProgress } from "../compare";
import { createSession, reduce, sessionStats, type SessionEvent, type SessionState } from "../session";
import { wordsOf } from "../text/provider";
import { createPhoneticEngine, type PhoneticEngine } from "./phonetic";
import type { EngineAction } from "./types";

/**
 * The typing area turns an engine action into a session event and nothing else
 * (see src/components/Practice.tsx). This mirrors that wiring so the two halves
 * are tested together rather than only on their own.
 */
function applyAction(state: SessionState, action: EngineAction, at: number): SessionState {
  switch (action.type) {
    case "append":
      return reduce(state, { type: "input", text: action.text, at });
    case "compose":
      return reduce(state, { type: "compose", text: action.text, composing: action.composing, at });
    case "backspace":
      return reduce(state, { type: "backspace", at });
    case "commit":
      return reduce(state, { type: "commit", at });
    default:
      return state;
  }
}

/** Type a string of individual keystrokes, one clock tick each. */
function typeKeys(
  engine: PhoneticEngine,
  session: SessionState,
  keys: readonly string[],
  startedAt = 1_000,
): SessionState {
  return keys.reduce(
    (state, key, index) =>
      applyAction(state, engine.translate({ key }), startedAt + (index + 1) * 100),
    session,
  );
}

describe("built-in mode end to end", () => {
  const sentence = "আমি বাংলায় গান গাই";

  it("types the starter sentence and scores it", () => {
    const engine = createPhoneticEngine();
    const target = wordsOf(sentence);
    let state = createSession({ targetWords: target });

    // ami banglay gan gai
    const keys = "ami banglay gan gai".split("");
    state = typeKeys(engine, state, keys);

    expect(state.state).toBe("finished");
    expect(state.committed).toHaveLength(4);
    expect(state.committed.map((word) => word.typed)).toEqual(target);

    const stats = sessionStats(state, state.finishedAt ?? 0);
    expect(stats.correctWords).toBe(4);
    expect(stats.incorrectWords).toBe(0);
    expect(stats.accuracy).toBe(100);
    expect(stats.words).toBe(4);
  });

  it("shows the Roman buffer for the word in progress", () => {
    const engine = createPhoneticEngine();
    let state = createSession({ targetWords: wordsOf(sentence) });

    state = typeKeys(engine, state, ["b", "a", "n", "g"]);

    expect(state.composing).toBe("bang");
    expect(state.active).toBe("বাং");

    const view = renderProgress(state.target, state.committed, state.active);
    expect(view.words[0].status).toBe("active");
    // বাং against আমি is wrong cluster by cluster, not a shift.
    expect(view.words[1].clusters.every((cluster) => cluster.state === "pending")).toBe(true);
  });

  it("recovers when a keystroke is taken back", () => {
    const engine = createPhoneticEngine();
    let state = createSession({ targetWords: wordsOf("আমার") });

    // Two consonants in a row take an automatic hasanta, so amr is আম্র.
    state = typeKeys(engine, state, ["a", "m", "r"]);
    expect(state.active).toBe("আম্র");

    state = applyAction(state, engine.translate({ key: "Backspace" }), 2_000);
    expect(state.composing).toBe("am");
    expect(state.active).toBe("আম");

    // Completing the last word commits it, so the word being typed is cleared.
    state = typeKeys(engine, state, ["a", "r"], 2_100);
    expect(state.state).toBe("finished");
    expect(state.active).toBe("");
    expect(state.committed[0].typed).toBe("আমার");
    expect(state.committed[0].correct).toBe(true);
  });

  it("starts the next word with an empty buffer after a space", () => {
    const engine = createPhoneticEngine();
    let state = createSession({ targetWords: wordsOf("আমি ভালো") });

    state = typeKeys(engine, state, "ami ".split(""));
    expect(state.committed).toHaveLength(1);
    expect(state.composing).toBe("");

    state = typeKeys(engine, state, "bhalo".split(""), 5_000);
    expect(state.state).toBe("finished");
    expect(state.committed.every((word) => word.correct)).toBe(true);
  });

  it("counts keystrokes as key presses, not code points", () => {
    const engine = createPhoneticEngine();
    const state = typeKeys(engine, createSession({ targetWords: wordsOf(sentence) }), "ami".split(""));

    expect(state.keystrokes).toBe(3);
    expect(state.startedAt).toBe(1_100);

    // The space that ends the word is a commit, not a text keystroke, which is
    // the same rule system mode follows.
    const committed = applyAction(state, engine.translate({ key: " " }), 2_000);
    expect(committed.keystrokes).toBe(3);
    expect(committed.committed).toHaveLength(1);
  });

  it("never claims the user is on the wrong keyboard in this mode", () => {
    const engine = createPhoneticEngine();
    const state = typeKeys(engine, createSession({ targetWords: wordsOf(sentence) }), "ami".split(""));

    expect(state.warning).toBeNull();
  });

  it("ignores a key that an installed Bangla keyboard already converted", () => {
    const engine = createPhoneticEngine();
    const action: EngineAction = engine.translate({ key: "ক" });

    expect(action).toEqual({ type: "ignore", reason: "wrong-script" });
    expect(engine.buffer()).toBe("");
  });
});
