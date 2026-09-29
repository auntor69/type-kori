/**
 * Badges and streaks: the "what have I actually achieved" layer on top of the
 * raw run history.
 *
 * Pure functions over stored data, so the progress page stays a thin renderer
 * and every threshold is unit tested. Nothing here reads storage or the DOM.
 */

import type { LessonProgressMap, RunRecord } from "./progress";

export type BadgeGroup = "milestone" | "speed" | "accuracy" | "volume" | "lessons" | "habit";

export interface Badge {
  id: string;
  group: BadgeGroup;
  /** The value that earns it, in the group's own unit. */
  threshold: number;
  /** How far along the user is toward it, clamped to 0–1. */
  progress: number;
  earned: boolean;
}

export interface BadgeInput {
  runs: readonly RunRecord[];
  lessons: LessonProgressMap;
}

/** Midnight-free day key: a run belongs to the local calendar day it was typed. */
export function dayKey(ts: number): string {
  const date = new Date(ts);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Distinct days with at least one finished run, newest first. */
export function typingDays(runs: readonly RunRecord[]): string[] {
  return [...new Set(runs.map((run) => dayKey(run.ts)))].sort().reverse();
}

/**
 * The run of consecutive days ending today or yesterday. A day that has not
 * happened yet does not break a streak, and neither does not having typed yet
 * today: the streak only ends once a whole day has passed.
 */
export function currentStreak(runs: readonly RunRecord[], now: number = Date.now()): number {
  const days = new Set(typingDays(runs));
  if (days.size === 0) return 0;

  const today = new Date(now);
  const start = days.has(dayKey(today.getTime()))
    ? today
    : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (!days.has(dayKey(start.getTime()))) return 0;

  let streak = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** The longest run of consecutive days ever recorded. */
export function longestStreak(runs: readonly RunRecord[]): number {
  const days = typingDays(runs).sort();
  if (days.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = new Date(days[index - 1]);
    const expected = new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + 1);
    if (dayKey(expected.getTime()) === days[index]) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

function bestAccuracy(runs: readonly RunRecord[]): number {
  return runs.reduce((best, run) => Math.max(best, run.accuracy), 0);
}

function bestWpm(runs: readonly RunRecord[]): number {
  return runs.reduce((best, run) => Math.max(best, run.wpm), 0);
}

function totalMs(runs: readonly RunRecord[]): number {
  return runs.reduce((sum, run) => sum + run.durationMs, 0);
}

function passedLessons(lessons: LessonProgressMap): number {
  return Object.values(lessons).filter((lesson) => lesson.completedAt !== null).length;
}

/** A run that was both flawless and quick. */
function hasFlawlessFastRun(runs: readonly RunRecord[]): boolean {
  return runs.some((run) => run.accuracy >= 100 && run.wpm >= 40);
}

function make(
  id: string,
  group: BadgeGroup,
  threshold: number,
  value: number,
): Badge {
  const progress = threshold <= 0 ? 1 : Math.min(1, value / threshold);
  return { id, group, threshold, progress, earned: value >= threshold };
}

/** Every badge, earned or not, so the page can show what is still ahead. */
export function evaluateBadges(input: BadgeInput): Badge[] {
  const { runs, lessons } = input;
  const best = bestWpm(runs);
  const accuracy = bestAccuracy(runs);
  const typed = totalMs(runs);
  const minutes = typed / 60_000;
  const streak = longestStreak(runs);
  const passed = passedLessons(lessons);

  return [
    make("firstRun", "milestone", 1, runs.length),
    make("runs10", "milestone", 10, runs.length),
    make("runs50", "milestone", 50, runs.length),
    make("runs250", "milestone", 250, runs.length),

    make("speed30", "speed", 30, best),
    make("speed40", "speed", 40, best),
    make("speed55", "speed", 55, best),
    make("speed75", "speed", 75, best),

    make("accuracy97", "accuracy", 97, accuracy),
    make("accuracy99", "accuracy", 99, accuracy),
    {
      id: "flawlessFast",
      group: "accuracy",
      threshold: 1,
      progress: hasFlawlessFastRun(runs) ? 1 : 0,
      earned: hasFlawlessFastRun(runs),
    },

    make("minutes10", "volume", 10, minutes),
    make("hours1", "volume", 60, minutes),
    make("hours10", "volume", 600, minutes),

    make("streak3", "habit", 3, streak),
    make("streak7", "habit", 7, streak),
    make("streak30", "habit", 30, streak),

    make("lesson1", "lessons", 1, passed),
    make("lesson6", "lessons", 6, passed),
    make("lesson12", "lessons", 12, passed),
  ];
}

export function earnedCount(badges: readonly Badge[]): number {
  return badges.filter((badge) => badge.earned).length;
}
