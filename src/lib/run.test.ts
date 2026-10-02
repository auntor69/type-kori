import { describe, expect, it } from "vitest";

import { practiceTexts } from "../content/texts";
import { clustersOf } from "../engine/compare";
import type { PracticeText } from "../engine/text/provider";
import { reduce } from "../engine/session";
import {
  buildVocabulary,
  createRun,
  extendStream,
  nextStreamSeed,
  parseTestType,
  STREAM_BUFFER,
  STREAM_EXTENSION,
  testTypeFor,
  type WordBankHandle,
} from "./run";

/** Any Bengali digit, zero included: the drawn number is not always zero-free. */
const BENGALI_NUMBER = /^[০-৯]+$/;

const vocabulary = buildVocabulary("all");

function fixedText(): PracticeText {
  return {
    id: "test-fixed",
    text: "কথা বলা শেখা ভালো কাজ করে সবাই মিলে",
    difficulty: "easy",
    topic: "practice",
    source: "original",
    reviewed: false,
  };
}

describe("buildVocabulary", () => {
  it("draws from the curated practice sentences", () => {
    expect(vocabulary.length).toBeGreaterThan(50);
    expect(vocabulary.every((word) => word.trim().length > 0)).toBe(true);
  });

  it("never streams the lesson drills: pedagogy is not vocabulary", () => {
    // Bare letters, syllable fragments, conjunct studies and digit tokens are
    // lesson material; a free-practice stream must type language, not the
    // alphabet. These shapes all exist in the drills and none in the stream.
    for (const fragment of ["ক", "খ", "কা", "কি", "র্ক", "০", "১০"]) {
      expect(vocabulary, fragment).not.toContain(fragment);
    }
    // Real words from the practice texts are all still in.
    expect(vocabulary).toContain("বাংলা");
  });

  it("narrows to a difficulty without emptying", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      expect(buildVocabulary(difficulty).length, difficulty).toBeGreaterThan(0);
    }
  });

  it("draws different vocabularies per difficulty, so a switch is visible", () => {
    const easy = new Set(buildVocabulary("easy"));
    const hard = new Set(buildVocabulary("hard"));
    const all = new Set(buildVocabulary("all"));

    // Every bucket keeps words the other buckets do not have — ordinary words
    // like ভালো appear at several levels, so the buckets only need to differ,
    // not to be disjoint — and the whole pool is strictly larger than either,
    // otherwise changing the setting could not change the words on screen.
    expect(all.size).toBeGreaterThan(easy.size);
    expect(all.size).toBeGreaterThan(hard.size);
    expect([...easy].some((word) => !hard.has(word))).toBe(true);
    expect([...hard].some((word) => !easy.has(word))).toBe(true);
  });
});

describe("createRun", () => {
  it("starts an endless run on a generated line", () => {
    const run = createRun({
      pool: practiceTexts,
      durationMs: null,
      seed: 7,
      infinite: true,
      vocabulary,
    });

    expect(run.bank).not.toBeNull();
    expect(run.session.infinite).toBe(true);
    expect(run.session.target.length).toBe(STREAM_BUFFER);
    expect(run.session.state).toBe("idle");
  });

  it("keeps a fixed text fixed, funbox or not", () => {
    const run = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 1,
      funbox: "numbers",
    });

    expect(run.bank).toBeNull();
    expect(run.session.infinite).toBe(false);
    expect(run.session.target.join(" ")).toBe(fixedText().text);
    // A funbox twist must never rewrite the user's own text.
    expect(run.session.target.some((word) => BENGALI_NUMBER.test(word))).toBe(false);
  });

  it("twists the generated line when a funbox mode is on", () => {
    const plain = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 11,
      infinite: true,
      vocabulary,
    });
    const numbers = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 11,
      infinite: true,
      vocabulary,
      funbox: "numbers",
    });

    expect(numbers.session.target.some((word) => BENGALI_NUMBER.test(word))).toBe(true);
    expect(
      numbers.session.target.filter((word) => !BENGALI_NUMBER.test(word)),
    ).toEqual(plain.session.target.filter((word, index) => index % 4 !== 1));
  });

  it("reverses whole clusters for the backwards mode", () => {
    const run = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 3,
      infinite: true,
      vocabulary,
      funbox: "backwards",
    });

    for (const word of run.session.target) {
      expect(clustersOf(word).length).toBeGreaterThan(0);
      const restored = clustersOf(word).reverse().join("");
      expect(vocabulary).toContain(restored);
    }
  });

  it("truncates to a word goal when no vocabulary backs the run", () => {
    const run = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 1,
      wordGoal: 3,
      infinite: false,
    });

    expect(run.session.target.length).toBe(3);
    expect(run.wordGoal).toBe(3);
    // Even a trimmed fixed run ends at the goal, never at the text's end.
    expect(run.session.endAfterWords).toBe(3);
  });

  it("streams a words-goal run from the vocabulary and ends exactly at the goal", () => {
    // Every curated practice sentence is a handful of words, so a goal of 25
    // cannot be a truncated single text: the run streams and the session cuts
    // it off the moment 25 words are committed.
    const goal = 25;
    const run = createRun({
      pool: practiceTexts,
      durationMs: null,
      seed: 3,
      wordGoal: goal,
      infinite: true,
      vocabulary,
    });

    expect(run.wordGoal).toBe(goal);
    expect(run.bank).not.toBeNull();
    expect(run.session.infinite).toBe(true);
    expect(run.session.endAfterWords).toBe(goal);
    // The island extends the stream while the caret is within three lines of
    // the end, so the first paint only carries the initial buffer — the goal
    // is guaranteed reachable by the extension, not by the first line.
    expect(run.session.target.length).toBeGreaterThan(0);
  });

  it("keeps a words run bounded while a words-goal run streams forever without one", () => {
    // A words-mode goal streams, so its words come from the bank; a fixed text
    // with no goal never streams at all.
    const fixed = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 2,
      wordGoal: null,
      infinite: false,
      vocabulary,
    });
    const streaming = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 2,
      wordGoal: null,
      infinite: true,
      vocabulary,
    });

    expect(fixed.session.infinite).toBe(false);
    expect(fixed.bank).toBeNull();
    expect(streaming.session.infinite).toBe(true);
    expect(streaming.bank).not.toBeNull();
  });

  it("keeps the text id history for the next draw", () => {
    const run = createRun({
      pool: practiceTexts,
      durationMs: 60_000,
      seed: 5,
      history: ["a", "b"],
    });

    expect(run.history.length).toBe(3);
    expect(run.history.slice(0, 2)).toEqual(["a", "b"]);
    expect(run.durationMs).toBe(60_000);
  });

  it("wires the letter/word strictness into the session it builds", () => {
    const letter = createRun({ pool: [fixedText()], durationMs: null, seed: 3, stopOnError: "letter" });
    expect(letter.session.stopOnLetter).toBe(true);
    expect(letter.session.stopOnError).toBe(false);

    const word = createRun({ pool: [fixedText()], durationMs: null, seed: 3, stopOnError: "word" });
    expect(word.session.stopOnError).toBe(true);
    expect(word.session.stopOnLetter).toBe(false);

    const off = createRun({ pool: [fixedText()], durationMs: null, seed: 3 });
    expect(off.session.stopOnError).toBe(false);
    expect(off.session.stopOnLetter).toBe(false);
  });

  it("is deterministic for a seed and varies with it", () => {
    const build = (seed: number) =>
      createRun({ pool: practiceTexts, durationMs: null, seed, infinite: true, vocabulary })
        .session.target.join(" ");

    expect(build(99)).toBe(build(99));
    expect(build(99)).not.toBe(build(100));
  });

  it("still builds a fixed run when the vocabulary is empty", () => {
    const run = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 1,
      infinite: true,
      vocabulary: [],
    });

    expect(run.bank).toBeNull();
    expect(run.session.infinite).toBe(false);
  });

  it("finishes a words-goal run exactly at the goal, even with a bank behind it", () => {
    // The full words-mode path: a streaming target with an endAfterWords cut.
    // Typing past the goal must not commit a single extra word.
    const goal = 5;
    const run = createRun({
      pool: practiceTexts,
      durationMs: null,
      seed: 7,
      wordGoal: goal,
      infinite: true,
      vocabulary,
    });

    let session = run.session;
    let at = 1_000;
    for (const word of session.target) {
      if (session.state === "finished") break;
      session = reduce(session, { type: "input", text: word, at });
      at += 10;
      session = reduce(session, { type: "commit", at });
      at += 10;
      if (session.state === "finished") break;
      // Keep the target fed the way the island does.
      if (session.target.length - session.committed.length < STREAM_BUFFER) {
        const stream = extendStream(run.bank!, session.target, "none");
        session = reduce(session, { type: "extend", words: stream.words, at });
      }
    }

    expect(session.state).toBe("finished");
    expect(session.committed.length).toBe(goal);
  });
});

describe("test types", () => {
  const CASES: readonly {
    input: Parameters<typeof testTypeFor>[0];
    label: string;
    kind: string;
    value: number | null;
  }[] = [
    { input: { durationMs: 60_000, wordGoal: null }, label: "time 60", kind: "time", value: 60 },
    { input: { durationMs: 300_000, wordGoal: null }, label: "time 300", kind: "time", value: 300 },
    // A duration the minute-only format could not have told apart from `time 1`.
    { input: { durationMs: 90_000, wordGoal: null }, label: "time 90", kind: "time", value: 90 },
    { input: { durationMs: null, wordGoal: 25 }, label: "words 25", kind: "words", value: 25 },
    { input: { durationMs: null, wordGoal: null }, label: "∞", kind: "endless", value: null },
    {
      input: { durationMs: null, wordGoal: null, kind: "lesson" },
      label: "lesson",
      kind: "lesson",
      value: null,
    },
    {
      input: { durationMs: null, wordGoal: null, kind: "custom" },
      label: "custom",
      kind: "custom",
      value: null,
    },
    {
      input: { durationMs: null, wordGoal: null, kind: "weak" },
      label: "weak",
      kind: "weak",
      value: null,
    },
    {
      input: { durationMs: 60_000, wordGoal: null, funbox: "numbers" },
      label: "time 60 · numbers",
      kind: "time",
      value: 60,
    },
  ];

  it("writes the label the progress page groups by", () => {
    for (const item of CASES) expect(testTypeFor(item.input), item.label).toBe(item.label);
  });

  it("reads back what it wrote, so the writer and reader cannot drift", () => {
    for (const item of CASES) {
      const parsed = parseTestType(item.label);
      expect(parsed.kind, item.label).toBe(item.kind);
      expect(parsed.value, item.label).toBe(item.value);
    }
  });

  it("keeps the funbox part when reading", () => {
    expect(parseTestType("time 60 · numbers").funbox).toBe("numbers");
    expect(parseTestType("words 25 · memory").funbox).toBe("memory");
    expect(parseTestType("words 25").funbox).toBe("none");
  });

  it("falls back to a single bucket for history it cannot place", () => {
    for (const input of [undefined, "", "something else", "time", "· numbers"]) {
      const parsed = parseTestType(input);
      expect(parsed.kind, String(input)).toBe("unknown");
      expect(parsed.value).toBeNull();
    }
  });
});

describe("the endless stream", () => {
  it("derives a new seed every time, so a line never repeats", () => {
    const seeds = new Set<number>();
    let seed = 1;
    for (let step = 0; step < 50; step += 1) {
      seed = nextStreamSeed(seed);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(0x7fff_ffff);
      seeds.add(seed);
    }
    expect(seeds.size).toBe(50);
  });

  it("grows the target without ever repeating the word just before it", () => {
    const run = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 21,
      infinite: true,
      vocabulary,
    });

    let handle = run.bank as WordBankHandle;
    let target = [...run.session.target];

    for (let step = 0; step < 40; step += 1) {
      const stream = extendStream(handle, target, "none");
      // The line that was on screen must not reappear.
      expect(stream.words.length).toBe(STREAM_EXTENSION);
      expect(stream.words.join(" ")).not.toBe(target.slice(-STREAM_EXTENSION).join(" "));

      const previous = target[target.length - 1];
      expect(stream.words[0]).not.toBe(previous);

      for (let index = 1; index < stream.words.length; index += 1) {
        expect(stream.words[index]).not.toBe(stream.words[index - 1]);
      }

      handle = stream.handle;
      target = [...target, ...stream.words];
    }

    expect(target.length).toBe(STREAM_BUFFER + STREAM_EXTENSION * 40);
    expect(target.every((word) => vocabulary.includes(word))).toBe(true);
  });

  it("carries the funbox into every later line", () => {
    const run = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 4,
      infinite: true,
      vocabulary,
      funbox: "punctuation",
    });

    let handle = run.bank as WordBankHandle;
    let target = [...run.session.target];

    for (let step = 0; step < 5; step += 1) {
      const stream = extendStream(handle, target, "punctuation");
      expect(stream.words.some((word) => /[।,—!“”]/.test(word))).toBe(true);
      handle = stream.handle;
      target = [...target, ...stream.words];
    }
  });

  it("stays deterministic when replayed from the same seed", () => {
    const run = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 8,
      infinite: true,
      vocabulary,
    });

    const replay = (handle: WordBankHandle, target: readonly string[]) =>
      Array.from({ length: 5 }).reduce<{ handle: WordBankHandle; target: string[] }>(
        (state) => {
          const stream = extendStream(state.handle, state.target, "none");
          return { handle: stream.handle, target: [...state.target, ...stream.words] };
        },
        { handle, target: [...run.session.target] },
      ).target.join(" ");

    expect(replay(run.bank as WordBankHandle, run.session.target)).toBe(
      replay(run.bank as WordBankHandle, run.session.target),
    );
  });
});

describe("stream capacity at high speed", () => {
  /**
   * A keystroke-level replay of the practice island's streaming loop, pushed
   * harder than any real typist: 150 words a minute (a word every 400 ms),
   * with the island's exact trigger — after every commit, extend when the
   * surplus has dropped to `3 * STREAM_BUFFER`. The run must never let the
   * caret near the end of the target, the render window must stay bounded,
   * and the visible block must not move when a batch lands.
   */
  it("feeds a 150+ WPM typist without the caret ever catching the stream", () => {
    const run = createRun({
      pool: [fixedText()],
      durationMs: null,
      seed: 11,
      infinite: true,
      vocabulary,
    });

    let session = run.session;
    let handle = run.bank as WordBankHandle;
    let extensions = 0;
    let minimumSurplus = Number.POSITIVE_INFINITY;
    let maximumWindow = 0;

    // The island's effect fires on mount too: the 12-word opening line is
    // extended to a full three-line block before the first keystroke.
    {
      const opening = extendStream(handle, session.target, "none");
      handle = opening.handle;
      session = reduce(session, { type: "extend", words: opening.words, at: 999 });
      extensions += 1;
    }

    const words = 300;
    for (let index = 0; index < words; index += 1) {
      const at = 1_000 + index * 400;
      const word = session.target[session.committed.length];
      if (word === undefined) break;

      session = reduce(session, { type: "input", text: word, at });
      session = reduce(session, { type: "commit", at: at + 10 });

      // The island's effect, verbatim: extend while the surplus is at or
      // under three lines' worth.
      if (session.target.length - session.committed.length <= 3 * STREAM_BUFFER) {
        const stream = extendStream(handle, session.target, "none");
        handle = stream.handle;
        session = reduce(session, { type: "extend", words: stream.words, at: at + 11 });
        extensions += 1;

        // A batch lands beyond the visible window (the caret index plus 36
        // pending words), so the on-screen block never moves when it arrives.
        expect(session.committed.length + 3 * STREAM_BUFFER).toBeLessThanOrEqual(
          session.target.length,
        );
      }

      const surplus = session.target.length - session.committed.length;
      minimumSurplus = Math.min(minimumSurplus, surplus);

      // The island's render window: 12 committed words back, 36 pending ahead.
      const windowStart = Math.max(0, session.committed.length - 12);
      const windowEnd = Math.min(session.target.length, session.committed.length + 36);
      maximumWindow = Math.max(maximumWindow, windowEnd - windowStart);

      expect(session.state).toBe("running");
    }

    expect(session.committed.length).toBe(words);
    // The caret never came within a line of the end of the target.
    expect(minimumSurplus).toBeGreaterThanOrEqual(STREAM_BUFFER);
    // The DOM stays small no matter how long the run goes on.
    expect(maximumWindow).toBeLessThanOrEqual(12 + 36);
    // A big batch means few rebuilds: roughly one extension per batch of 36
    // words, not one per second.
    expect(extensions).toBeLessThanOrEqual(Math.ceil(words / STREAM_EXTENSION) + 2);
  });

  it("keeps a words-goal run exact while streaming at high speed", () => {
    const goal = 100;
    const run = createRun({
      pool: practiceTexts,
      durationMs: null,
      seed: 13,
      wordGoal: goal,
      infinite: true,
      vocabulary,
    });

    let session = run.session;
    let handle = run.bank as WordBankHandle;

    for (let index = 0; session.state !== "finished"; index += 1) {
      const at = 1_000 + index * 300; // 200 WPM, faster than the goal above.
      const word = session.target[session.committed.length];
      if (word === undefined) break;

      session = reduce(session, { type: "input", text: word, at });
      session = reduce(session, { type: "commit", at: at + 10 });

      if (session.target.length - session.committed.length <= 3 * STREAM_BUFFER) {
        const stream = extendStream(handle, session.target, "none");
        handle = stream.handle;
        session = reduce(session, { type: "extend", words: stream.words, at: at + 11 });
      }

      expect(index).toBeLessThan(goal + 10);
    }

    expect(session.state).toBe("finished");
    expect(session.committed.length).toBe(goal);
  });
});
