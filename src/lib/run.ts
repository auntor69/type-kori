/**
 * Building and extending a run.
 *
 * This lives outside the practice island so the interesting part — which words a
 * run starts with, how the funbox twists them, and how the endless stream grows —
 * can be unit tested without a DOM. The island keeps the state, the keyboard and
 * the rendering; everything here is a pure function of its arguments.
 */

import { practiceTexts } from "../content/texts";
import { createSession, type SessionState } from "../engine/session";
import { createWordBank, drawWords, type WordBank } from "../engine/wordbank";
import {
  createRng,
  pickText,
  wordsOf,
  type Difficulty,
  type PracticeText,
} from "../engine/text/provider";
import { applyFunbox, isFunboxMode, type FunboxMode } from "./funbox";

/** How far ahead of the caret the stream keeps drawing new words. */
export const STREAM_BUFFER = 12;
/**
 * How many words one extension adds: three lines' worth at the fluid page
 * width. The island re-extends the moment the surplus drops to
 * `3 * STREAM_BUFFER`, so at 100+ WPM (1.7 words a second) a fresh batch
 * lands every ~20 seconds — and the batch lands beyond the 36-word render
 * window, so the visible block never moves when it arrives. A big batch also
 * buys headroom: the caret would need over twenty seconds of blocked main
 * thread to catch the stream.
 */
export const STREAM_EXTENSION = 3 * STREAM_BUFFER;
/** How many recent text ids are excluded when drawing the next fixed text. */
export const HISTORY_LIMIT = 6;

/** Everything needed to keep feeding words into a running target. */
export interface WordBankHandle {
  bank: WordBank;
  /** Seed lineage: every extension derives from the previous one. */
  seed: number;
}

export interface RunModel {
  text: PracticeText;
  durationMs: number | null;
  session: SessionState;
  history: readonly string[];
  /** Words mode: end after this many committed words; null = text/timed mode. */
  wordGoal: number | null;
  /** Infinite streaming: the word bank backing this run, or null for fixed texts. */
  bank: WordBankHandle | null;
  /**
   * The funbox this run started with, pinned at creation: a mid-run settings
   * change must not twist the words already on screen or the ones drawn next.
   */
  funbox: FunboxMode;
}

export interface RunOptions {
  pool: readonly PracticeText[];
  durationMs: number | null;
  seed: number;
  history?: readonly string[];
  difficulty?: Difficulty | "all";
  /** Letter/word strictness, applied for the whole run. */
  stopOnError?: "off" | "letter" | "word";
  /** Words mode target; null keeps the whole text. */
  wordGoal?: number | null;
  /** Infinite streaming mode; false keeps a fixed target text. */
  infinite?: boolean;
  vocabulary?: readonly string[];
  /** Funbox twist applied to every drawn line; fixed texts ignore it. */
  funbox?: FunboxMode;
}

/**
 * The vocabulary the infinite stream draws from: the curated practice
 * sentences.
 *
 * The lesson drills are deliberately excluded. They are pedagogy, not
 * vocabulary — bare letters (ক খ গ), syllable fragments (কা কি), conjunct
 * studies (র্ক র্ত) and digit tokens (০১ ২৩) — and a free-practice stream
 * built from them types the alphabet instead of language. Lessons drill those
 * shapes themselves; the stream only ever offers real words.
 */
export function buildVocabulary(difficulty: Difficulty | "all"): string[] {
  const texts =
    difficulty === "all" ? practiceTexts : practiceTexts.filter((text) => text.difficulty === difficulty);

  const words: string[] = [];
  for (const text of texts) words.push(...wordsOf(text));

  // A difficulty bucket can never be empty (the content validator guarantees
  // texts per level), but a guard costs nothing.
  if (words.length === 0) {
    for (const text of practiceTexts) words.push(...wordsOf(text));
  }
  return words;
}

/** The seed for the next line of a stream: derived from the one before it. */
export function nextStreamSeed(seed: number): number {
  return (seed * 1_664_525 + 1_013_904_223) % 0x7fff_ffff;
}

/**
 * Draw the next line of an endless run, avoiding the words already on screen.
 * Returns the updated handle as well, because the seed is the whole point: a run
 * that reused a seed would repeat its line.
 */
export function extendStream(
  handle: WordBankHandle,
  target: readonly string[],
  funbox: FunboxMode,
  count = STREAM_EXTENSION,
): { handle: WordBankHandle; words: string[] } {
  const seed = nextStreamSeed(handle.seed);
  const words = applyFunbox(
    drawWords(handle.bank, count, seed, target.slice(-8)),
    funbox,
    createRng(seed),
  );
  return { handle: { bank: handle.bank, seed }, words };
}

/** What kind of test produced a run, as stored on the run record. */
export type TestTypeKind = "time" | "words" | "endless" | "lesson" | "custom" | "weak" | "unknown";

export interface ParsedTestType {
  kind: TestTypeKind;
  /** Seconds for `time`, the word count for `words`, null otherwise. */
  value: number | null;
  funbox: FunboxMode;
}

/**
 * The test type written onto a finished run, e.g. `time 60` (seconds), `words 25`,
 * `∞`, `lesson`, with ` · numbers` appended when a funbox mode is on. Kept beside its
 * parser so the two cannot drift: the progress page groups by this string, and a
 * mismatch would silently create a new personal-best row per run.
 */
export function testTypeFor(options: {
  durationMs: number | null;
  wordGoal: number | null;
  kind?: "lesson" | "custom" | "weak";
  funbox?: FunboxMode;
}): string {
  const { durationMs, wordGoal, kind, funbox = "none" } = options;

  const base =
    kind !== undefined
      ? kind
      : wordGoal !== null
        ? `words ${wordGoal}`
        : durationMs !== null
          ? `time ${Math.round(durationMs / 1000)}`
          : "∞";

  return funbox === "none" ? base : `${base} · ${funbox}`;
}

export function parseTestType(testType: string | undefined): ParsedTestType {
  if (testType === undefined || testType.length === 0) {
    return { kind: "unknown", value: null, funbox: "none" };
  }

  const [base = "", rawFunbox] = testType.split(" · ");
  const funbox = isFunboxMode(rawFunbox) ? rawFunbox : "none";

  const time = /^time (\d+)$/.exec(base);
  if (time !== null) return { kind: "time", value: Number(time[1]), funbox };

  const words = /^words (\d+)$/.exec(base);
  if (words !== null) return { kind: "words", value: Number(words[1]), funbox };

  if (base === "∞") return { kind: "endless", value: null, funbox };
  if (base === "lesson" || base === "custom" || base === "weak") {
    return { kind: base, value: null, funbox };
  }

  return { kind: "unknown", value: null, funbox };
}

/**
 * Build one run. An endless run starts with a generated line and keeps growing;
 * a fixed text (a lesson drill, a weak-key drill, a pasted passage) ends at its
 * own last word and is never twisted by the funbox.
 */
export function createRun(options: RunOptions): RunModel {
  const {
    pool,
    durationMs,
    seed,
    history = [],
    difficulty = "all",
    stopOnError = "off",
    wordGoal = null,
    infinite = false,
    vocabulary,
    funbox = "none",
  } = options;

  const text = pickText(pool, { difficulty, exclude: [...history], rng: createRng(seed) }) ?? pool[0];
  const nextHistory = [...history, text.id].slice(-HISTORY_LIMIT);

  if (infinite && vocabulary !== undefined && vocabulary.length > 0) {
    const bank = createWordBank(vocabulary);
    const first = applyFunbox(drawWords(bank, STREAM_BUFFER, seed), funbox, createRng(seed));

    return {
      text,
      durationMs,
      session: createSession({
        targetWords: first,
        durationMs,
        stopOnError: stopOnError === "word",
        stopOnLetter: stopOnError === "letter",
        infinite: true,
        // Words mode: the run ends the moment the goal is reached, even
        // though the target keeps streaming ahead of the caret.
        endAfterWords: wordGoal ?? undefined,
      }),
      history: nextHistory,
      wordGoal,
      bank: { bank, seed },
      funbox,
    };
  }

  // Fixed text: a lesson drill, a pasted passage or a single sentence. A words
  // goal only ever trims such a text when no vocabulary is available (the
  // caller chose `infinite: false`); with a goal and a bank the run streams
  // above instead, so any goal from 10 to 100 always has words to type.
  const allWords = wordsOf(text);
  const targetWords = wordGoal !== null ? allWords.slice(0, wordGoal) : allWords;

  return {
    text,
    durationMs,
    session: createSession({
      targetWords,
      durationMs,
      stopOnError: stopOnError === "word",
      stopOnLetter: stopOnError === "letter",
      infinite: false,
      endAfterWords: wordGoal ?? undefined,
    }),
    history: nextHistory,
    wordGoal,
    bank: null,
    funbox: "none",
  };
}
