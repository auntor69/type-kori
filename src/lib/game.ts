/**
 * Falling words: the arcade mode, built on the stream the rest of the app uses.
 *
 * The words come from the same curated vocabulary the endless practice stream
 * draws from (`buildVocabulary` + `drawWords`), so the game teaches the same
 * vocabulary rather than a second, thinner word list — and it stays honest about
 * what it is: a drill with a clock on it, not a separate curriculum.
 *
 * This module is the whole rulebook, kept pure so it can be tested without a DOM:
 *
 *   - a word falls for `fallMs`, then it escapes and costs a life;
 *   - the learner types what is on the screen; a complete match is a hit, and a
 *     match scores one point per cluster, so a long word is worth more;
 *   - input that cannot lead to any word in play is a miss — except in built-in
 *     phonetic mode, where the engine re-converts the whole word as keys arrive
 *     and a half-typed word can legitimately look wrong for a moment. That case
 *     is documented on `setTyped`'s `forgiving` option.
 *
 * Time is always an argument (`now`), never a clock read inside, which is what
 * makes every rule below testable.
 */

import { splitClusters } from "../engine/unicode";

/** The three speeds the game offers. */
export type GameLevel = "easy" | "normal" | "hard";

export const GAME_LEVEL_ORDER: readonly GameLevel[] = ["easy", "normal", "hard"];

export interface GameConfig {
  /** How many words may be falling at once. */
  simultaneous: number;
  /** How long one word takes to reach the bottom, in milliseconds. */
  fallMs: number;
  /** How long the gap is between two entries, once there is room. */
  spawnMs: number;
  /** How many escapes end the round. */
  lives: number;
  /** How many words the round serves in total. */
  total: number;
  /** How many lanes a word can enter in. */
  lanes: number;
}

export const GAME_LEVELS: Record<GameLevel, GameConfig> = {
  // Read ":30" as "a word every 30 seconds of typing"; the numbers are tuned so
  // that a two-cluster word at 20 WPM (roughly two words a second) is comfortable
  // on easy and needs real speed on hard.
  easy: { simultaneous: 3, fallMs: 9000, spawnMs: 2200, lives: 5, total: 30, lanes: 4 },
  normal: { simultaneous: 4, fallMs: 6500, spawnMs: 1500, lives: 4, total: 40, lanes: 5 },
  hard: { simultaneous: 5, fallMs: 4200, spawnMs: 950, lives: 3, total: 50, lanes: 6 },
};

export function isGameLevel(value: unknown): value is GameLevel {
  return value === "easy" || value === "normal" || value === "hard";
}

/** One word in play. */
export interface FallingWord {
  id: number;
  text: string;
  /** Which lane it entered, 0-based. */
  lane: number;
  spawnedAt: number;
  /** When it reaches the bottom. */
  dueAt: number;
}

export interface GameState {
  level: GameLevel;
  config: GameConfig;
  /** Words in play, oldest first. */
  words: readonly FallingWord[];
  /** The words the round will serve, in order. */
  queue: readonly string[];
  /** What the learner has typed for the word being aimed at. */
  typed: string;
  score: number;
  hits: number;
  misses: number;
  escapes: number;
  lives: number;
  /** How many words the round has already sent in. */
  served: number;
  nextSpawnAt: number;
  nextId: number;
  startedAt: number;
  finishedAt: number | null;
}

export interface GameStart {
  level: GameLevel;
  /** The words to serve, in order: one per word the round will send. */
  queue: readonly string[];
  now: number;
}

export function createGame({ level, queue, now }: GameStart): GameState {
  const config = GAME_LEVELS[level];
  return {
    level,
    config,
    words: [],
    queue,
    typed: "",
    score: 0,
    hits: 0,
    misses: 0,
    escapes: 0,
    lives: config.lives,
    served: 0,
    // The first word enters on the first tick, so a game starts when the field
    // does rather than before the player has looked at it.
    nextSpawnAt: now,
    nextId: 1,
    startedAt: now,
    finishedAt: null,
  };
}

/**
 * Spread words across lanes without ever repeating a lane twice in a row: with a
 * step of `lanes - 1` the walk visits every lane before wrapping, and consecutive
 * entries are adjacent rather than stacked.
 */
export function laneFor(index: number, lanes: number): number {
  if (lanes <= 1) return 0;
  return (index * (lanes - 1)) % lanes;
}

/** How far a word has fallen, 0 at the top and 1 at the bottom. */
export function wordProgress(word: FallingWord, now: number): number {
  const span = word.dueAt - word.spawnedAt;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (now - word.spawnedAt) / span));
}

/** A word is worth one point per cluster: longer words are worth more. */
export function wordPoints(text: string): number {
  return Math.max(1, splitClusters(text).length);
}

function isFinished(state: GameState): boolean {
  return state.finishedAt !== null;
}

/**
 * Move the game on to `now`: let words escape, and send the next one in when
 * there is room. Returns the same object when nothing happened, so a caller that
 * ticks every frame does not re-render for nothing.
 */
export function tick(state: GameState, now: number): GameState {
  if (isFinished(state)) return state;

  const survivors: FallingWord[] = [];
  let escapes = state.escapes;
  let lives = state.lives;

  for (const word of state.words) {
    if (now >= word.dueAt) {
      escapes += 1;
      lives -= 1;
    } else {
      survivors.push(word);
    }
  }

  let words = survivors;
  let served = state.served;
  let nextId = state.nextId;
  let nextSpawnAt = state.nextSpawnAt;

  while (
    served < state.queue.length &&
    served < state.config.total &&
    words.length < state.config.simultaneous &&
    now >= nextSpawnAt
  ) {
    const text = state.queue[served];
    words = [
      ...words,
      {
        id: nextId,
        text,
        lane: laneFor(served, state.config.lanes),
        spawnedAt: now,
        dueAt: now + state.config.fallMs,
      },
    ];
    served += 1;
    nextId += 1;
    nextSpawnAt = now + state.config.spawnMs;
  }

  // The round is over when the lives are gone, or when every word has been sent
  // and the last one has left the field one way or the other.
  const roundOver = served >= state.queue.length && words.length === 0;

  const changed = words !== state.words || escapes !== state.escapes || roundOver;
  if (!changed) return state;

  return {
    ...state,
    words,
    escapes,
    lives,
    served,
    nextSpawnAt,
    nextId,
    finishedAt: lives <= 0 || roundOver ? now : null,
  };
}

export interface TypedOptions {
  /**
   * Built-in phonetic mode: the engine re-converts the whole word on every key,
   * so a half-typed word can be off the target for a moment and the dictionary
   * can still rescue it at the end (`kotha` only becomes কথা once it is complete).
   * With `forgiving` the buffer is kept and no miss is counted; a wrong word then
   * simply never completes, and what costs the learner is the word escaping.
   */
  forgiving?: boolean;
}

/**
 * Set what has been typed for the word being aimed at.
 *
 * Setting rather than appending is what makes the built-in phonetic engine
 * usable here: its output for `k` is ক and for `kh` is খ, so the buffer it
 * produces is a fresh string each time, not a stream of letters.
 */
export function setTyped(
  state: GameState,
  typed: string,
  now: number,
  options: TypedOptions = {},
): GameState {
  if (isFinished(state)) return state;

  const text = typed.slice(0, 40);
  if (text.length === 0) return state.typed === "" ? state : { ...state, typed: "" };

  const hit = state.words.find((word) => word.text === text);
  if (hit !== undefined) {
    return {
      ...state,
      words: state.words.filter((word) => word.id !== hit.id),
      typed: "",
      score: state.score + wordPoints(hit.text),
      hits: state.hits + 1,
    };
  }

  const onTrack = state.words.some((word) => word.text.startsWith(text));
  if (onTrack) return { ...state, typed: text };

  // Nothing in play starts with this: either a slip, or a phonetic word that the
  // engine has not finished converting. Only the first is a miss.
  if (options.forgiving === true) return { ...state, typed: text };
  return { ...state, typed: "", misses: state.misses + 1 };
}

/** Take back the last cluster typed, for Backspace. */
export function backspaceTyped(state: GameState): GameState {
  if (isFinished(state) || state.typed.length === 0) return state;
  const clusters = splitClusters(state.typed);
  clusters.pop();
  return { ...state, typed: clusters.join("") };
}

/** Pause is the caller's business; this is only the clock, frozen at `now`. */
export function resumeGame(state: GameState, now: number, pausedFor: number): GameState {
  if (pausedFor <= 0) return state;
  return {
    ...state,
    startedAt: state.startedAt + pausedFor,
    nextSpawnAt: state.nextSpawnAt + pausedFor,
    words: state.words.map((word) => ({
      ...word,
      spawnedAt: word.spawnedAt + pausedFor,
      dueAt: word.dueAt + pausedFor,
    })),
  };
}

export interface GameSummary {
  score: number;
  hits: number;
  misses: number;
  escapes: number;
  lives: number;
  served: number;
  total: number;
  /** Hits as a share of everything that left the field or was mistyped. */
  accuracy: number;
  durationMs: number;
}

export function gameSummary(state: GameState, now: number): GameSummary {
  const attempts = state.hits + state.misses + state.escapes;
  return {
    score: state.score,
    hits: state.hits,
    misses: state.misses,
    escapes: state.escapes,
    lives: Math.max(0, state.lives),
    served: state.served,
    total: Math.min(state.config.total, state.queue.length),
    accuracy: attempts === 0 ? 0 : Math.round((state.hits / attempts) * 100),
    durationMs: Math.max(0, (state.finishedAt ?? now) - state.startedAt),
  };
}

/** True once the round is over, for the view to switch to its summary. */
export function isGameOver(state: GameState): boolean {
  return state.finishedAt !== null;
}
