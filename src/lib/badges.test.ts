import { describe, expect, it } from "vitest";

import { currentStreak, dayKey, earnedCount, evaluateBadges, longestStreak, typingDays } from "./badges";
import type { LessonProgressMap, RunRecord } from "./progress";

const DAY = 24 * 60 * 60 * 1000;
/** A fixed "now" so the streak tests never depend on the day they run. */
const NOW = new Date(2026, 8, 29, 12).getTime();

function makeRun(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "run-1",
    ts: NOW,
    mode: "system",
    textId: "easy-1",
    wpm: 30,
    kpm: 120,
    accuracy: 96,
    durationMs: 60_000,
    errors: [],
    ...overrides,
  };
}

function passedLesson(): LessonProgressMap {
  return { "lesson-1": { bestAccuracy: 95, bestWpm: 20, completedAt: NOW } };
}

describe("typing days and streaks", () => {
  it("keys a run by its local calendar day", () => {
    expect(dayKey(new Date(2026, 0, 5, 23).getTime())).toBe("2026-01-05");
  });

  it("lists distinct days newest first, once per day", () => {
    const runs = [
      makeRun({ ts: NOW }),
      makeRun({ id: "b", ts: NOW - DAY }),
      makeRun({ id: "c", ts: NOW - 2 * 60 * 60 * 1000 }),
      makeRun({ id: "d", ts: NOW - 2 * DAY - 5 * 60 * 60 * 1000 }),
    ];

    expect(typingDays(runs)).toEqual([dayKey(NOW), dayKey(NOW - DAY), dayKey(NOW - 2 * DAY)]);
  });

  it("counts a streak that is still alive today", () => {
    const runs = [
      makeRun({ ts: NOW }),
      makeRun({ id: "b", ts: NOW - DAY }),
      makeRun({ id: "c", ts: NOW - 2 * DAY }),
    ];
    expect(currentStreak(runs, NOW)).toBe(3);
    expect(longestStreak(runs)).toBe(3);
  });

  it("keeps yesterday's streak alive before today's first run", () => {
    const runs = [
      makeRun({ ts: NOW - DAY }),
      makeRun({ id: "b", ts: NOW - 2 * DAY }),
    ];
    expect(currentStreak(runs, NOW)).toBe(2);
  });

  it("breaks the streak once a whole day has passed", () => {
    const runs = [makeRun({ ts: NOW - 3 * DAY }), makeRun({ id: "b", ts: NOW - 4 * DAY })];
    expect(currentStreak(runs, NOW)).toBe(0);
    expect(longestStreak(runs)).toBe(2);
  });

  it("reports no streak at all before the first run", () => {
    expect(currentStreak([], NOW)).toBe(0);
    expect(longestStreak([])).toBe(0);
  });

  it("finds the longest run when the history has gaps", () => {
    const runs = [
      makeRun({ ts: NOW }),
      makeRun({ id: "b", ts: NOW - 10 * DAY }),
      makeRun({ id: "c", ts: NOW - 11 * DAY }),
      makeRun({ id: "d", ts: NOW - 12 * DAY }),
    ];
    expect(longestStreak(runs)).toBe(3);
    expect(currentStreak(runs, NOW)).toBe(1);
  });
});

describe("evaluateBadges", () => {
  it("earns nothing without history", () => {
    const badges = evaluateBadges({ runs: [], lessons: {} });
    expect(badges.every((badge) => !badge.earned)).toBe(true);
    expect(earnedCount(badges)).toBe(0);
  });

  it("earns what the runs actually prove", () => {
    const runs = [makeRun({ wpm: 45, accuracy: 100, durationMs: 10 * 60_000 })];
    const badges = evaluateBadges({ runs, lessons: passedLesson() });
    const earned = new Set(badges.filter((badge) => badge.earned).map((badge) => badge.id));

    expect(earned.has("firstRun")).toBe(true);
    expect(earned.has("speed30")).toBe(true);
    expect(earned.has("speed40")).toBe(true);
    expect(earned.has("speed55")).toBe(false);
    expect(earned.has("accuracy99")).toBe(true);
    expect(earned.has("flawlessFast")).toBe(true);
    expect(earned.has("minutes10")).toBe(true);
    expect(earned.has("hours1")).toBe(false);
    expect(earned.has("lesson1")).toBe(true);
    expect(earned.has("lesson12")).toBe(false);
    expect(earned.has("streak3")).toBe(false);
  });

  it("counts a flawless run only when it is also quick", () => {
    const slow = evaluateBadges({
      runs: [makeRun({ wpm: 12, accuracy: 100 })],
      lessons: {},
    }).find((badge) => badge.id === "flawlessFast");
    expect(slow?.earned).toBe(false);
  });

  it("reports partial progress toward the badges that are still out of reach", () => {
    const badges = evaluateBadges({
      runs: Array.from({ length: 5 }, (_value, index) => makeRun({ id: `r${index}` })),
      lessons: {},
    });

    expect(badges.find((badge) => badge.id === "runs10")?.progress).toBeCloseTo(0.5);
    expect(badges.find((badge) => badge.id === "runs10")?.earned).toBe(false);
    expect(badges.find((badge) => badge.id === "runs50")?.progress).toBeCloseTo(0.1);
  });
});
