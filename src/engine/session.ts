/**
 * The run state machine: `idle` → (first valid input) → `running` → `finished`.
 *
 * It is a pure reducer: every event carries the timestamp that produced it, so
 * the whole engine is deterministic and unit-testable without a DOM or a clock.
 * The timer starts on the first keystroke, never when the page loads.
 */

import { sameWord, clustersOf, type WordResult } from "./compare";
import { computeStats, type Stats } from "./metrics";
import { hasLatinLetters, normalizeText, splitClusters } from "./unicode";

export type RunState = "idle" | "running" | "finished";

export interface SessionOptions {
  targetWords: readonly string[];
  /** null = untimed: the run ends with the last word. */
  durationMs?: number | null;
  /** Word mode: a wrong word cannot be committed (Section 7.4.5). */
  stopOnError?: boolean;
  /**
   * Letter mode: a wrong character never lands on the screen at all. Checked
   * on `input` events — the system keyboard's direct path. The built-in
   * phonetic engine is exempt: its intermediate transliterations legitimately
   * pass through shapes that are not prefixes of the target, so gating them
   * would stall the conversion.
   */
  stopOnLetter?: boolean;
  /** End the run once this many words have been committed (words mode). */
  endAfterWords?: number;
  /**
   * No fixed end: the island keeps extending the target while the user types,
   * so the run only stops on a timer, a word goal or an explicit end event.
   * Off for fixed texts — a pasted passage or a lesson drill finishes at its
   * own last word.
   */
  infinite?: boolean;
}

export interface SessionState {
  readonly state: RunState;
  readonly target: readonly string[];
  readonly committed: readonly WordResult[];
  /** The word currently being typed, as Bangla text. */
  readonly active: string;
  /** Roman keystrokes buffered for that word in built-in mode, for the hint. */
  readonly composing: string;
  readonly keystrokes: number;
  readonly correctedMistakes: number;
  readonly startedAt: number | null;
  readonly finishedAt: number | null;
  readonly durationMs: number | null;
  readonly stopOnError: boolean;
  /** Letter mode: refuse a wrong character as it is typed. */
  readonly stopOnLetter: boolean;
  /** Words mode: finish once committed reaches this count. */
  readonly endAfterWords: number | undefined;
  /** Streaming run: the island appends words; nothing ends on its own. */
  readonly infinite: boolean;
  /** Target cluster → how often it was mistyped in this run. */
  readonly errorMap: Readonly<Record<string, number>>;
  /** Set when Latin letters arrive where Bangla is expected. */
  readonly warning: "latin" | null;
}

export type SessionEvent =
  | { type: "input"; text: string; at: number }
  /** Built-in mode: the engine reports the whole word, not a delta. */
  | { type: "compose"; text: string; composing: string; at: number }
  | { type: "backspace"; at: number }
  | { type: "commit"; at: number }
  | { type: "tick"; at: number }
  | { type: "restart"; at: number }
  /** Infinite runs: append freshly generated words to the target. */
  | { type: "extend"; words: readonly string[]; at: number }
  /** Zen/infinite runs: stop here and show results for what was typed. */
  | { type: "end"; at: number };

export function createSession(options: SessionOptions): SessionState {
  return {
    state: "idle",
    target: options.targetWords,
    committed: [],
    active: "",
    composing: "",
    keystrokes: 0,
    correctedMistakes: 0,
    startedAt: null,
    finishedAt: null,
    durationMs: options.durationMs ?? null,
    stopOnError: options.stopOnError ?? false,
    stopOnLetter: options.stopOnLetter ?? false,
    endAfterWords: options.endAfterWords,
    infinite: options.infinite ?? false,
    errorMap: {},
    warning: null,
  };
}

export function targetIndex(state: SessionState): number {
  return Math.min(state.committed.length, state.target.length);
}

export function currentTargetWord(state: SessionState): string | null {
  return state.target[targetIndex(state)] ?? null;
}

export function elapsedMs(state: SessionState, at: number): number {
  if (state.startedAt === null) return 0;
  const end = state.finishedAt ?? at;
  const raw = Math.max(0, end - state.startedAt);
  return state.durationMs !== null ? Math.min(raw, state.durationMs) : raw;
}

export function sessionStats(state: SessionState, at: number): Stats {
  return computeStats({
    committed: state.committed,
    keystrokes: state.keystrokes,
    correctedMistakes: state.correctedMistakes,
    elapsedMs: elapsedMs(state, at),
  });
}

function withErrorMap(
  errorMap: Readonly<Record<string, number>>,
  target: string,
  typed: string,
): Record<string, number> {
  const targetClusters = clustersOf(target);
  const typedClusters = clustersOf(typed);

  let next: Record<string, number> | null = null;
  targetClusters.forEach((cluster, index) => {
    if (typedClusters[index] === cluster) return;
    if (next === null) next = { ...errorMap };
    next[cluster] = (next[cluster] ?? 0) + 1;
  });

  return next ?? (errorMap as Record<string, number>);
}

function commitActive(state: SessionState): SessionState {
  const index = targetIndex(state);
  const target = state.target[index];
  if (target === undefined) return state;

  const typed = normalizeText(state.active);
  const result: WordResult = { target, typed, correct: sameWord(target, typed) };

  return {
    ...state,
    committed: [...state.committed, result],
    active: "",
    composing: "",
    errorMap: withErrorMap(state.errorMap, target, typed),
  };
}

function finish(state: SessionState, at: number): SessionState {
  let next = state;

  // The last word is committed when the run ends (Section 7.5).
  if (next.active.length > 0 && targetIndex(next) < next.target.length) {
    next = commitActive(next);
  }

  return { ...next, state: "finished", finishedAt: at };
}

function startClock(state: SessionState, at: number): SessionState {
  if (state.startedAt !== null) return state;
  return { ...state, startedAt: at, state: "running" };
}

/** Shared tail of every event that changes the word being typed. */
function afterWordChange(state: SessionState, at: number): SessionState {
  const index = targetIndex(state);
  const isLastWord = index === state.target.length - 1;

  if (isLastWord && sameWord(state.target[index], state.active)) {
    const completed = commitActive(state);
    // A streaming run never ends on the last target word: the island is
    // expected to extend the target before the user gets there.
    if (completed.infinite) {
      return completed;
    }
    return { ...completed, state: "finished", finishedAt: at };
  }

  // Words mode: the goal is a count, not the end of the target.
  if (state.endAfterWords !== undefined && state.committed.length >= state.endAfterWords) {
    return finish(state, at);
  }

  if (state.durationMs !== null && elapsedMs(state, at) >= state.durationMs) {
    return finish(state, at);
  }

  return state;
}

/**
 * Letter mode's test: does everything typed so far still sit on the target
 * word, cluster by cluster? Overshooting the word counts as wrong too — in
 * this mode extra letters simply never appear (that is `hideExtraLetters`'s
 * job in the free modes).
 */
function lettersMatchTarget(target: string, active: string): boolean {
  const targetClusters = clustersOf(target);
  const activeClusters = splitClusters(active);

  if (activeClusters.length > targetClusters.length) return false;
  for (let index = 0; index < activeClusters.length; index += 1) {
    if (activeClusters[index] !== targetClusters[index]) return false;
  }
  return true;
}

function handleInput(state: SessionState, text: string, at: number): SessionState {
  const normalized = normalizeText(text);
  if (normalized.length === 0) return state;

  const started = startClock(state, at);
  const active = started.active + normalized;
  const target = started.target[targetIndex(started)] ?? "";

  // Letter mode: a wrong character is refused before it reaches the screen.
  // The clock still starts (the keystroke happened) but the text, the
  // keystroke count and the error map are untouched — nothing was typed.
  if (started.stopOnLetter && !lettersMatchTarget(target, active)) {
    return {
      ...started,
      warning: hasLatinLetters(normalized) ? "latin" : started.warning,
    };
  }

  const next: SessionState = {
    ...started,
    active,
    // One input event is one keystroke, whatever it produces: in system mode a
    // single key press can deliver a whole conjunct.
    keystrokes: started.keystrokes + 1,
    warning: hasLatinLetters(normalized) ? "latin" : started.warning,
  };

  return afterWordChange(next, at);
}

function handleCompose(
  state: SessionState,
  text: string,
  composing: string,
  at: number,
): SessionState {
  const started = startClock(state, at);
  const next: SessionState = {
    ...started,
    active: normalizeText(text),
    composing,
    keystrokes: started.keystrokes + 1,
  };

  return afterWordChange(next, at);
}

function handleBackspace(state: SessionState, at: number): SessionState {
  if (state.state === "finished") return state;

  if (state.active.length > 0) {
    const clusters = splitClusters(state.active);
    const removed = clusters[clusters.length - 1] ?? "";
    const index = targetIndex(state);
    const wasWrong = clustersOf(state.target[index] ?? "")[clusters.length - 1] !== removed;

    return {
      ...state,
      active: clusters.slice(0, -1).join(""),
      composing: "",
      keystrokes: state.keystrokes + 1,
      correctedMistakes: state.correctedMistakes + (wasWrong ? 1 : 0),
    };
  }

  // Nothing left in the current word: reopen the previous committed word so a
  // mistake can still be fixed (Section 7.3.7).
  if (state.committed.length > 0) {
    const previous = state.committed[state.committed.length - 1];
    const clusters = splitClusters(previous.typed);

    return {
      ...state,
      committed: state.committed.slice(0, -1),
      active: clusters.slice(0, -1).join(""),
      composing: "",
      keystrokes: state.keystrokes + 1,
      correctedMistakes: state.correctedMistakes + (previous.correct ? 0 : 1),
    };
  }

  return state;
}

function handleCommit(state: SessionState, at: number): SessionState {
  if (state.state === "finished") return state;
  if (targetIndex(state) >= state.target.length) return state;

  const target = state.target[targetIndex(state)];
  if (state.stopOnError && !sameWord(target, state.active)) return state;

  let next = startClock(state, at);
  next = commitActive(next);

  if (targetIndex(next) >= next.target.length) {
    if (next.infinite) return next;
    return { ...next, state: "finished", finishedAt: at };
  }

  if (next.endAfterWords !== undefined && next.committed.length >= next.endAfterWords) {
    return finish(next, at);
  }

  if (next.durationMs !== null && elapsedMs(next, at) >= next.durationMs) {
    return finish(next, at);
  }

  return next;
}

export function reduce(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case "input":
      if (state.state === "finished") return state;
      return handleInput(state, event.text, event.at);
    case "compose":
      if (state.state === "finished") return state;
      return handleCompose(state, event.text, event.composing, event.at);
    case "backspace":
      return handleBackspace(state, event.at);
    case "commit":
      return handleCommit(state, event.at);
    case "tick":
      if (state.state !== "running") return state;
      if (state.durationMs === null) return state;
      if (elapsedMs(state, event.at) < state.durationMs) return state;
      return finish(state, event.at);
    case "restart":
      return createSession({
        targetWords: state.target,
        durationMs: state.durationMs,
        stopOnError: state.stopOnError,
        stopOnLetter: state.stopOnLetter,
        endAfterWords: state.endAfterWords,
        infinite: state.infinite,
      });
    case "extend": {
      if (state.state === "finished") return state;
      if (event.words.length === 0) return state;
      return { ...state, target: [...state.target, ...event.words] };
    }
    case "end":
      if (state.state === "finished") return state;
      return finish(state, event.at);
    default:
      return state;
  }
}
