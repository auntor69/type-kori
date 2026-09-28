import { describe, expect, it } from "vitest";

import { renderProgress } from "./compare";
import {
  createSession,
  currentTargetWord,
  elapsedMs,
  reduce,
  sessionStats,
  targetIndex,
  type SessionState,
} from "./session";

const target = ["আমি", "ভালো", "আছি"];

/**
 * Feed units of input one at a time, the way a keyboard does: one event per key,
 * and a single key can deliver a whole cluster such as মি.
 */
function type(state: SessionState, units: readonly string[], at: number): SessionState {
  return units.reduce((current, unit) => reduce(current, { type: "input", text: unit, at }), state);
}

function press(state: SessionState, key: "backspace" | "commit", at: number): SessionState {
  return reduce(state, { type: key, at });
}

describe("createSession", () => {
  it("starts idle with no clock running", () => {
    const state = createSession({ targetWords: target });

    expect(state.state).toBe("idle");
    expect(state.startedAt).toBeNull();
    expect(state.active).toBe("");
    expect(state.committed).toEqual([]);
    expect(targetIndex(state)).toBe(0);
    expect(currentTargetWord(state)).toBe("আমি");
  });
});

describe("the clock", () => {
  it("starts on the first keystroke, not before", () => {
    const idle = createSession({ targetWords: target });
    expect(elapsedMs(idle, 5_000)).toBe(0);

    const running = type(idle, ["আ"], 1_000);
    expect(running.state).toBe("running");
    expect(running.startedAt).toBe(1_000);
    expect(elapsedMs(running, 4_000)).toBe(3_000);
  });

  it("does not restart on later keystrokes", () => {
    const state = type(type(createSession({ targetWords: target }), ["আ"], 1_000), ["মি"], 2_000);
    expect(state.startedAt).toBe(1_000);
  });
});

describe("committing words", () => {
  it("moves to the next word and resets the current input", () => {
    const typed = type(createSession({ targetWords: target }), ["আ", "মি"], 1_000);
    const state = press(typed, "commit", 2_000);

    expect(state.committed).toEqual([{ target: "আমি", typed: "আমি", correct: true }]);
    expect(state.active).toBe("");
    expect(currentTargetWord(state)).toBe("ভালো");
  });

  it("counts a word as correct only when the whole word matches", () => {
    const typed = type(createSession({ targetWords: target }), ["আ", "মি", "ক"], 1_000);
    const state = press(typed, "commit", 2_000);

    expect(state.committed[0]).toEqual({ target: "আমি", typed: "আমিক", correct: false });
  });

  it("counts an empty commit as one wrong word", () => {
    const state = press(createSession({ targetWords: ["আমি"] }), "commit", 1_000);

    expect(state.committed).toEqual([{ target: "আমি", typed: "", correct: false }]);
    expect(state.state).toBe("finished");
  });

  it("finishes as soon as the last word is typed in full", () => {
    const state = type(createSession({ targetWords: ["আমি"] }), ["আ", "মি"], 1_000);

    expect(state.state).toBe("finished");
    expect(state.finishedAt).toBe(1_000);
    expect(state.committed).toHaveLength(1);
    expect(sessionStats(state, 1_000).correctWords).toBe(1);
  });

  it("refuses a wrong commit in stop-on-error mode", () => {
    let state = type(createSession({ targetWords: target, stopOnError: true }), ["ক"], 1_000);
    state = press(state, "commit", 2_000);

    expect(state.committed).toEqual([]);
    expect(state.active).toBe("ক");

    state = press(state, "backspace", 3_000);
    state = type(state, ["আ", "মি"], 4_000);
    state = press(state, "commit", 5_000);

    expect(state.committed).toHaveLength(1);
    expect(state.committed[0].correct).toBe(true);
  });

  it("ignores input once the run is finished", () => {
    const finished = type(createSession({ targetWords: ["আমি"] }), ["আ", "মি"], 1_000);
    const after = type(finished, ["ক"], 2_000);

    expect(after).toBe(finished);
  });
});

describe("backspace", () => {
  it("removes the last cluster of the current word", () => {
    const typed = type(createSession({ targetWords: target }), ["কা", "ম"], 1_000);
    const state = press(typed, "backspace", 2_000);

    expect(state.active).toBe("কা");
    expect(state.correctedMistakes).toBe(1);
  });

  it("does not count a corrected mistake when the removed cluster was right", () => {
    const typed = type(createSession({ targetWords: target }), ["আ", "মি"], 1_000);
    const state = press(typed, "backspace", 2_000);

    expect(state.active).toBe("আ");
    expect(state.correctedMistakes).toBe(0);
  });

  it("removes a whole conjunct as one cluster", () => {
    const typed = type(createSession({ targetWords: ["ক্ষ", "ক"] }), ["ক্ষ"], 1_000);
    expect(typed.active).toBe("ক্ষ");

    const state = press(typed, "backspace", 2_000);

    expect(state.active).toBe("");
    expect(state.correctedMistakes).toBe(0);
  });

  it("reopens the previous committed word when the current one is empty", () => {
    let state = type(createSession({ targetWords: target }), ["আ", "মি"], 1_000);
    state = press(state, "commit", 2_000);
    state = press(state, "backspace", 3_000);

    expect(state.committed).toEqual([]);
    expect(state.active).toBe("আ");
    expect(currentTargetWord(state)).toBe("আমি");
    expect(state.correctedMistakes).toBe(0);
  });

  it("counts a corrected mistake when an incorrect word is reopened", () => {
    let state = type(createSession({ targetWords: target }), ["ভু", "ল"], 1_000);
    state = press(state, "commit", 2_000);
    state = press(state, "backspace", 3_000);

    expect(state.correctedMistakes).toBe(1);
  });

  it("does nothing when there is nothing to delete", () => {
    const state = press(createSession({ targetWords: target }), "backspace", 1_000);

    expect(state.state).toBe("idle");
    expect(state.keystrokes).toBe(0);
  });
});

describe("the error map", () => {
  it("counts misses per target cluster when a word is committed", () => {
    const typed = type(createSession({ targetWords: ["কাজ"] }), ["কা", "ম"], 1_000);
    const state = press(typed, "commit", 2_000);

    expect(state.errorMap).toEqual({ জ: 1 });
  });

  it("counts a missing cluster against the target cluster", () => {
    const typed = type(createSession({ targetWords: ["কাজ", "ভালো"] }), ["কা"], 1_000);
    const state = press(typed, "commit", 2_000);

    expect(state.errorMap).toEqual({ জ: 1 });
  });
});

describe("timed runs", () => {
  it("finishes when the tick reaches the duration", () => {
    let state = type(createSession({ targetWords: target, durationMs: 60_000 }), ["আ"], 1_000);
    state = reduce(state, { type: "tick", at: 30_000 });
    expect(state.state).toBe("running");

    state = reduce(state, { type: "tick", at: 61_000 });
    expect(state.state).toBe("finished");
    expect(elapsedMs(state, 61_000)).toBe(60_000);
  });

  it("commits the word in progress when the timer runs out", () => {
    let state = type(createSession({ targetWords: target, durationMs: 60_000 }), ["আ", "মি"], 1_000);
    state = press(state, "commit", 2_000);
    state = type(state, ["ভা"], 3_000);
    state = reduce(state, { type: "tick", at: 61_000 });

    expect(state.committed).toHaveLength(2);
    expect(state.committed[1]).toEqual({ target: "ভালো", typed: "ভা", correct: false });
  });

  it("ignores ticks in an untimed run", () => {
    let state = type(createSession({ targetWords: target }), ["আ"], 1_000);
    state = reduce(state, { type: "tick", at: 600_000 });

    expect(state.state).toBe("running");
  });
});

describe("input from the wrong keyboard", () => {
  it("flags Latin letters so the interface can warn", () => {
    const state = type(createSession({ targetWords: target }), ["a", "m"], 1_000);
    expect(state.warning).toBe("latin");
  });

  it("stays quiet for Bangla input", () => {
    const state = type(createSession({ targetWords: target }), ["আ", "মি"], 1_000);
    expect(state.warning).toBeNull();
  });
});

describe("restart", () => {
  it("clears the run but keeps the text", () => {
    let state = type(createSession({ targetWords: target }), ["আ", "মি"], 1_000);
    state = press(state, "commit", 2_000);
    state = reduce(state, { type: "restart", at: 3_000 });

    expect(state.state).toBe("idle");
    expect(state.committed).toEqual([]);
    expect(state.active).toBe("");
    expect(state.startedAt).toBeNull();
    expect(state.keystrokes).toBe(0);
    expect(state.target).toEqual(target);
  });
});

describe("statistics over a whole run", () => {
  it("scores a complete run with a correction", () => {
    let state = createSession({ targetWords: target });
    state = type(state, ["আ", "মি"], 1_000);
    state = press(state, "commit", 2_000);
    state = type(state, ["ভা", "ল"], 3_000);
    state = press(state, "backspace", 4_000); // removes ল, which was wrong
    state = type(state, ["লো"], 5_000);
    state = press(state, "commit", 6_000);
    state = type(state, ["আ", "ছি"], 7_000);

    const stats = sessionStats(state, 7_000);

    expect(state.state).toBe("finished");
    expect(stats.words).toBe(3);
    expect(stats.correctWords).toBe(3);
    expect(stats.accuracy).toBe(100);
    expect(stats.elapsedMs).toBe(6_000);
    expect(stats.wpm).toBe(30);
    expect(stats.correctedMistakes).toBe(1);
    expect(stats.keystrokes).toBe(8);
  });

  it("drives the rendered view for the typing area", () => {
    let state = createSession({ targetWords: target });
    state = type(state, ["আ", "মি"], 1_000);
    state = press(state, "commit", 2_000);
    state = type(state, ["ভা"], 3_000);

    const view = renderProgress(state.target, state.committed, state.active);

    expect(view.words.map((word) => word.status)).toEqual(["correct", "active", "pending"]);
    expect(view.activeIndex).toBe(1);
  });
});
