/**
 * Practice text: the model, validation rules and the selection logic.
 *
 * Texts are original, tagged with a difficulty, and carry a review flag. Nothing
 * unreviewed ships to production (checked by scripts/validate-text.mjs).
 */

import { isBanglaOnly, splitWords } from "../unicode";

export type Difficulty = "easy" | "medium" | "hard";

export const difficulties: readonly Difficulty[] = ["easy", "medium", "hard"];

export interface PracticeText {
  id: string;
  text: string;
  difficulty: Difficulty;
  topic: string;
  source: "original";
  reviewed: boolean;
}

export type Rng = () => number;

/** Deterministic PRNG (mulberry32) so text choice can be unit tested. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffff_ffff);
}

export interface PickOptions {
  difficulty?: Difficulty | "all";
  /** Text ids to avoid, normally the recent history. */
  exclude?: readonly string[];
  rng?: Rng;
}

export function textsForDifficulty(
  texts: readonly PracticeText[],
  difficulty?: Difficulty | "all",
): PracticeText[] {
  if (!difficulty || difficulty === "all") return [...texts];
  return texts.filter((text) => text.difficulty === difficulty);
}

/**
 * Choose a text, avoiding the excluded ids when there is anything else left.
 * Returns null only when there are no texts at all.
 */
export function pickText(
  texts: readonly PracticeText[],
  options: PickOptions = {},
): PracticeText | null {
  const candidates = textsForDifficulty(texts, options.difficulty);
  if (candidates.length === 0) return null;

  const exclude = new Set(options.exclude ?? []);
  const fresh = candidates.filter((text) => !exclude.has(text.id));
  const pool = fresh.length > 0 ? fresh : candidates;

  const rng = options.rng ?? Math.random;
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index];
}

export function wordsOf(text: PracticeText | string): string[] {
  return splitWords(typeof text === "string" ? text : text.text);
}

export interface TextSetReport {
  /** Problems that must fail the build. */
  errors: string[];
  /** Texts still waiting for a native-speaker review. */
  unreviewed: string[];
}

/** Validate a raw content set. Used by the build-time content check. */
export function validateTextSet(entries: unknown): TextSetReport {
  const errors: string[] = [];
  const unreviewed: string[] = [];
  const seenIds = new Set<string>();

  if (!Array.isArray(entries)) {
    return { errors: ["content set must be an array"], unreviewed };
  }

  entries.forEach((entry, index) => {
    const where = `entry ${index}`;
    if (typeof entry !== "object" || entry === null) {
      errors.push(`${where}: not an object`);
      return;
    }

    const text = entry as Partial<PracticeText>;
    if (typeof text.id !== "string" || text.id.length === 0) {
      errors.push(`${where}: missing id`);
    } else if (seenIds.has(text.id)) {
      errors.push(`${where}: duplicate id ${text.id}`);
    } else {
      seenIds.add(text.id);
    }

    if (typeof text.text !== "string" || text.text.trim().length === 0) {
      errors.push(`${where}: missing text`);
    } else if (!isBanglaOnly(text.text)) {
      errors.push(`${where}: text contains characters outside the Bengali block`);
    }

    if (typeof text.difficulty !== "string" || !difficulties.includes(text.difficulty as Difficulty)) {
      errors.push(`${where}: difficulty must be one of ${difficulties.join(", ")}`);
    }

    if (typeof text.topic !== "string" || text.topic.length === 0) {
      errors.push(`${where}: missing topic`);
    }

    if (text.source !== "original") {
      errors.push(`${where}: source must be "original"`);
    }

    if (text.reviewed !== true) {
      unreviewed.push(typeof text.id === "string" ? text.id : where);
    }
  });

  return { errors, unreviewed };
}
