import { describe, expect, it } from "vitest";

import {
  GAME_LEVELS,
  GAME_LEVEL_ORDER,
  backspaceTyped,
  createGame,
  gameSummary,
  isGameLevel,
  isGameOver,
  laneFor,
  resumeGame,
  setTyped,
  tick,
  wordPoints,
  wordProgress,
  type GameState,
} from "./game";

const QUEUE = ["কেমন", "আছ", "ভালো", "স্কুল", "জ্ঞান", "বাংলা"];

function game(level: "easy" | "normal" | "hard" = "easy", queue: readonly string[] = QUEUE): GameState {
  return createGame({ level, queue, now: 1_000 });
}

/** The first tick, which sends the first word in. */
const OPENED = tick(game(), 1_000);

describe("starting a round", () => {
  it("sends the first word in only when the field is looked at", () => {
    expect(game().words).toEqual([]);
    expect(OPENED.words).toHaveLength(1);
    expect(OPENED.words[0].text).toBe(QUEUE[0]);
    expect(OPENED.served).toBe(1);
  });

  it("keeps the level's own speed", () => {
    const words = tick(game("hard"), 1_000).words;
    expect(words[0].dueAt - words[0].spawnedAt).toBe(GAME_LEVELS.hard.fallMs);
    expect(GAME_LEVELS.hard.lives).toBeLessThan(GAME_LEVELS.easy.lives);
  });

  it("refuses a level that is not one of the three", () => {
    expect(isGameLevel("easy")).toBe(true);
    expect(isGameLevel("impossible")).toBe(false);
    expect(isGameLevel(undefined)).toBe(false);
    expect(GAME_LEVEL_ORDER).toEqual(["easy", "normal", "hard"]);
  });

  it("has a sane configuration for every level", () => {
    for (const level of GAME_LEVEL_ORDER) {
      const config = GAME_LEVELS[level];
      expect(config.simultaneous, level).toBeGreaterThan(0);
      expect(config.fallMs, level).toBeGreaterThan(config.spawnMs);
      expect(config.lives, level).toBeGreaterThan(0);
      expect(config.total, level).toBeGreaterThan(0);
      expect(config.lanes, level).toBeGreaterThan(0);
      // Enough lane changes that two words in a row never share a lane.
      if (config.lanes > 1) expect(laneFor(0, config.lanes)).not.toBe(laneFor(1, config.lanes));
    }
  });
});

describe("spawning", () => {
  it("respects the gap and the field's capacity", () => {
    // At the spawn time one more may enter, and no more than that.
    const second = tick(OPENED, 1_000 + GAME_LEVELS.easy.spawnMs);
    expect(second.words).toHaveLength(2);

    // Before the gap, nothing.
    expect(tick(OPENED, 1_000 + GAME_LEVELS.easy.spawnMs - 1).words).toHaveLength(1);
  });

  it("never has more in play than the level allows", () => {
    let state = game("hard");
    for (let step = 0; step < 40; step += 1) state = tick(state, 1_000 + step * 100);

    expect(state.words.length).toBeLessThanOrEqual(GAME_LEVELS.hard.simultaneous);
  });

  it("stops when the queue runs out instead of inventing words", () => {
    const queue = QUEUE.slice(0, 2);
    let state = createGame({ level: "easy", queue, now: 0 });
    for (let step = 0; step < 40; step += 1) state = tick(state, step * 200);

    expect(state.served).toBeLessThanOrEqual(2);
    expect(state.words.every((word) => queue.includes(word.text))).toBe(true);
  });

  it("gives every word its own id", () => {
    let state = OPENED;
    for (let step = 1; step <= 3; step += 1) {
      state = tick(state, 1_000 + step * GAME_LEVELS.easy.spawnMs);
    }
    const ids = state.words.map((word) => word.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("typing", () => {
  it("scores a completed word, one point per cluster", () => {
    const hit = setTyped(OPENED, "কেমন", 1_100);
    expect(hit.hits).toBe(1);
    expect(hit.score).toBe(wordPoints("কেমন"));
    expect(hit.words.some((word) => word.text === "কেমন")).toBe(false);
    expect(hit.typed).toBe("");
  });

  it("counts a partial word as progress, not as a mistake", () => {
    const partial = setTyped(OPENED, "কে", 1_100);
    expect(partial.misses).toBe(0);
    expect(partial.typed).toBe("কে");
    expect(partial.words).toHaveLength(1);
  });

  it("counts input that cannot lead anywhere as a miss, and clears the buffer", () => {
    const miss = setTyped(OPENED, "খ", 1_100);
    expect(miss.misses).toBe(1);
    expect(miss.typed).toBe("");
    expect(miss.hits).toBe(0);
  });

  it("keeps a phonetic buffer that is only provisionally wrong", () => {
    // The engine turns `kotha` into কথা as a whole word, so half of it can be off
    // the target for a moment; in forgiving mode that is not a mistake yet.
    const provisional = setTyped(OPENED, "কো", 1_100, { forgiving: true });
    expect(provisional.misses).toBe(0);
    expect(provisional.typed).toBe("কো");

    // …and it is still a miss if the learner then completes a wrong word.
    expect(setTyped(provisional, "খ", 1_200, { forgiving: true }).typed).toBe("খ");
  });

  it("prefers the word that is complete over a longer one that starts the same", () => {
    const queue = ["ক", "কম"];
    const opened = tick(createGame({ level: "easy", queue, now: 0 }), 0);
    let state = tick(opened, GAME_LEVELS.easy.spawnMs);

    state = setTyped(state, "ক", GAME_LEVELS.easy.spawnMs + 10);
    expect(state.hits).toBe(1);
    expect(state.words.map((word) => word.text)).toEqual(["কম"]);
  });

  it("takes back one cluster at a time", () => {
    const partial = setTyped(OPENED, "কেম", 1_100);
    expect(backspaceTyped(partial).typed).toBe("কে");
    expect(backspaceTyped(backspaceTyped(partial)).typed).toBe("");
    expect(backspaceTyped(partial).misses).toBe(0);
  });

  it("does nothing at all once the round is over", () => {
    const dead = { ...OPENED, finishedAt: 2_000 };
    expect(setTyped(dead, "কেমন", 2_100)).toBe(dead);
    expect(backspaceTyped(dead)).toBe(dead);
    expect(tick(dead, 3_000)).toBe(dead);
  });
});

describe("escaping", () => {
  it("costs a life when a word reaches the bottom", () => {
    const fallen = tick(OPENED, 1_000 + GAME_LEVELS.easy.fallMs);
    expect(fallen.escapes).toBe(1);
    expect(fallen.lives).toBe(GAME_LEVELS.easy.lives - 1);
    // The escaped word is gone. Later entries may already have taken its place:
    // by the time one word has crossed the field, the next one is on its way.
    expect(fallen.words.map((word) => word.text)).not.toContain(QUEUE[0]);
    for (const word of fallen.words) expect(word.spawnedAt).toBeGreaterThan(1_000);
  });

  it("ends the round when the lives are gone", () => {
    let state = createGame({ level: "hard", queue: Array.from({ length: 50 }, () => "ক"), now: 0 });
    let now = 0;
    while (!isGameOver(state) && now < 200_000) {
      now += 500;
      state = tick(state, now);
    }

    expect(isGameOver(state)).toBe(true);
    const summary = gameSummary(state, now);
    expect(summary.escapes).toBeGreaterThanOrEqual(GAME_LEVELS.hard.lives);
    expect(summary.lives).toBe(0);
    expect(summary.score).toBe(0);
  });

  it("ends the round when the last word has been dealt with", () => {
    let state = createGame({ level: "easy", queue: ["কেমন"], now: 0 });
    state = tick(state, 0);
    state = setTyped(state, "কেমন", 500);

    // The word is gone, so the next tick sees an empty field and a spent queue.
    expect(state.served).toBe(1);
    expect(isGameOver(state)).toBe(false);
    expect(isGameOver(tick(state, 600))).toBe(true);
  });
});

describe("the clock", () => {
  it("reports how far a word has fallen", () => {
    const word = OPENED.words[0];
    expect(wordProgress(word, word.spawnedAt)).toBe(0);
    expect(wordProgress(word, word.spawnedAt + GAME_LEVELS.easy.fallMs / 2)).toBeCloseTo(0.5, 2);
    expect(wordProgress(word, word.dueAt)).toBe(1);
    expect(wordProgress(word, word.dueAt + 10_000)).toBe(1);
  });

  it("reads a word as the sum of its clusters", () => {
    expect(wordPoints("ক")).toBe(1);
    expect(wordPoints("কেমন")).toBe(3);
    // A conjunct is one cluster, not two consonants.
    expect(wordPoints("ক্ষ")).toBe(1);
    expect(wordPoints("")).toBe(1);
  });

  it("gives a lane walk that visits every lane without repeating one", () => {
    for (const lanes of [2, 3, 4, 5, 6]) {
      const walk = Array.from({ length: lanes }, (_, index) => laneFor(index, lanes));
      expect(new Set(walk).size, `lanes ${lanes}`).toBe(lanes);
      for (let index = 1; index < 20; index += 1) {
        expect(laneFor(index, lanes), `lanes ${lanes} at ${index}`).not.toBe(laneFor(index - 1, lanes));
      }
    }
    expect(laneFor(0, 1)).toBe(0);
  });

  it("shifts every deadline by however long the game was paused", () => {
    const paused = resumeGame(OPENED, 5_000, 2_000);
    expect(paused.startedAt).toBe(OPENED.startedAt + 2_000);
    expect(paused.nextSpawnAt).toBe(OPENED.nextSpawnAt + 2_000);
    expect(paused.words[0].dueAt).toBe(OPENED.words[0].dueAt + 2_000);
    expect(paused.words[0].spawnedAt).toBe(OPENED.words[0].spawnedAt + 2_000);
    // Pausing for no time is not a change at all.
    expect(resumeGame(OPENED, 5_000, 0)).toBe(OPENED);
  });
});

describe("the summary", () => {
  it("counts hits, misses and escapes against each other", () => {
    let state = OPENED;
    state = setTyped(state, "কেমন", 1_100); // hit
    state = setTyped(state, "খ", 1_200); // miss
    state = tick(state, 1_000 + GAME_LEVELS.easy.fallMs); // the rest escapes

    const summary = gameSummary(state, 20_000);
    expect(summary.hits).toBe(1);
    expect(summary.misses).toBe(1);
    expect(summary.score).toBe(wordPoints("কেমন"));
    expect(summary.accuracy).toBeGreaterThan(0);
    expect(summary.accuracy).toBeLessThanOrEqual(100);
    expect(summary.durationMs).toBe(19_000);
  });

  it("never divides by zero on an untouched round", () => {
    const summary = gameSummary(game(), 1_000);
    expect(summary.accuracy).toBe(0);
    expect(summary.hits).toBe(0);
    expect(summary.total).toBeLessThanOrEqual(QUEUE.length);
  });
});
