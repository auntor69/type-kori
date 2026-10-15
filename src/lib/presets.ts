/**
 * Shareable test links.
 *
 * A whole test can live in the query string: the text to type, the time or word
 * goal, the funbox, the difficulty and the keyboard layout. That is what lets a
 * teacher hand out one link that opens exactly the exercise they set, and what
 * makes "the daily challenge" pattern (`?daily=…`) general. Nothing is stored
 * server-side, because there is no server — the URL is the whole state.
 *
 * Decoding is defensive: every field is validated on its own and a bad one is
 * dropped rather than taking the link down with it, so a hand-edited URL still
 * opens a usable test. `decodePreset` returns null when the URL carries no
 * preset at all, which is how the island tells "no preset" from "an empty one".
 */

import type { LayoutId } from "../engine/layouts/types";
import type { Difficulty } from "../engine/text/provider";
import { checkCustomText } from "./customText";
import { isFunboxMode, type FunboxMode } from "./funbox";

export interface Preset {
  /** Timed run, in seconds. Mutually exclusive with `words`. */
  time?: number;
  /** Word goal. Mutually exclusive with `time`. */
  words?: number;
  funbox?: FunboxMode;
  difficulty?: Difficulty | "all";
  /** The Bangla text to type, for a preset exercise. */
  text?: string;
  layout?: LayoutId;
}

/** One hour, matching the command grammar's ceiling. */
const MAX_TIME_SECONDS = 3600;
const MAX_WORDS = 1000;
const DIFFICULTIES: readonly (Difficulty | "all")[] = ["all", "easy", "medium", "hard"];

const isLayoutId = (value: unknown): value is LayoutId =>
  value === "national" || value === "probhat";

function positiveInt(value: string | null, max: number): number | undefined {
  if (value === null) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return undefined;
  return Math.min(max, Math.round(number));
}

/** Build the query string for a preset, skipping anything unset. */
export function encodePreset(preset: Preset): string {
  const params = new URLSearchParams();

  // A word goal wins over a timer, in the encoder as well as the decoder: a
  // fixed count is the more specific instruction, and the two cannot both apply.
  if (preset.words !== undefined) params.set("w", String(Math.round(preset.words)));
  else if (preset.time !== undefined) params.set("t", String(Math.round(preset.time)));
  if (preset.funbox !== undefined && preset.funbox !== "none") params.set("f", preset.funbox);
  if (preset.difficulty !== undefined && preset.difficulty !== "all") {
    params.set("d", preset.difficulty);
  }
  if (preset.layout !== undefined) params.set("layout", preset.layout);
  if (preset.text !== undefined && preset.text.length > 0) params.set("text", preset.text);

  return params.toString();
}

/**
 * Read a preset out of a query string. Returns null when there is nothing preset
 * shaped in it, so a plain visit does not look like a preset with no options.
 */
export function decodePreset(search: string): Preset | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const preset: Preset = {};

  const time = positiveInt(params.get("t"), MAX_TIME_SECONDS);
  const words = positiveInt(params.get("w"), MAX_WORDS);
  // A word goal wins over a timer when a hand-edited link carries both: a fixed
  // count is the more specific instruction, and one of the two must win.
  if (words !== undefined) preset.words = words;
  else if (time !== undefined) preset.time = time;

  const funbox = params.get("f");
  if (isFunboxMode(funbox) && funbox !== "none") preset.funbox = funbox;

  const difficulty = params.get("d");
  if (difficulty !== null && (DIFFICULTIES as readonly string[]).includes(difficulty)) {
    preset.difficulty = difficulty as Difficulty | "all";
  }

  const layout = params.get("layout");
  if (isLayoutId(layout)) preset.layout = layout;

  // Preset text goes through exactly the same validation as a paste, so a link
  // can never put something into the typing area that a user could not paste.
  const text = params.get("text");
  if (text !== null && text.length > 0) {
    const check = checkCustomText(text);
    if (check.ok) preset.text = check.text;
  }

  return Object.keys(preset).length > 0 ? preset : null;
}

/**
 * The absolute URL for a preset: the current page with the preset's query
 * string. Any existing query is replaced, so a shared link never carries a
 * stale preset as well as the new one.
 */
export function presetUrl(base: string, preset: Preset): string {
  const url = new URL(base);
  url.search = encodePreset(preset);
  return url.toString();
}
