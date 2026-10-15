/**
 * The per-run detail view's logic, kept out of the island so it can be tested.
 *
 * Two things about a finished run are worth recomputing rather than reading back:
 *
 *   - its consistency, which is derived from the per-second speed samples. The
 *     number is deliberately *not* stored on the run: it is a function of the
 *     samples, so storing it would only give two places to disagree. Runs
 *     recorded before sampling existed have no samples and no consistency, and
 *     saying "not measured" is honest where 0 would not be.
 *   - the link that repeats the test, which is built from the run's own test type
 *     through the same preset encoder the share button uses. A `time 60` run gets
 *     a link that opens a 60-second run, funbox included; a lesson, a paste, an
 *     endless run or a drill has no preset to encode, so there is no link rather
 *     than a link that opens something else.
 */

import { consistency } from "../engine/metrics";
import { parseTestType, type ParsedTestType } from "./run";
import { encodePreset, type Preset } from "./presets";
import type { RunRecord } from "./progress";

/**
 * The run's consistency score, or null when the run carries too few samples to
 * compute one. Never 0 for "no data": 0% consistency is a real (if unlucky)
 * measurement, and the view must be able to tell the two apart.
 */
export function runConsistency(run: RunRecord): number | null {
  const samples = run.samples;
  if (samples === undefined || samples.length < 2) return null;
  return consistency(samples);
}

/**
 * The run's speed samples, in order, as long as they are usable. An empty array
 * means there is no curve to draw.
 */
export function runSamples(run: RunRecord): number[] {
  const samples = run.samples ?? [];
  return samples.filter((value) => Number.isFinite(value));
}

/** True when the run's own test type can be turned back into a preset. */
export function isRepeatable(parsed: ParsedTestType): boolean {
  return (parsed.kind === "time" || parsed.kind === "words") && parsed.value !== null;
}

/**
 * The preset that repeats this run, or null when the test type does not describe
 * something settable: a lesson, a paste, a weak-key or adaptive drill, the daily
 * challenge and the endless stream are all targets rather than options.
 */
export function retryPreset(run: RunRecord): Preset | null {
  const parsed = parseTestType(run.testType);
  if (!isRepeatable(parsed) || parsed.value === null) return null;

  const preset: Preset = parsed.kind === "time" ? { time: parsed.value } : { words: parsed.value };
  if (parsed.funbox !== "none") preset.funbox = parsed.funbox;
  return preset;
}

/**
 * The query string that repeats this run, or null when there is nothing to
 * repeat. Encoded through the shared encoder, so the link this produces is the
 * same kind of link the practice page's share button produces.
 */
export function retryQuery(run: RunRecord): string | null {
  const preset = retryPreset(run);
  return preset === null ? null : encodePreset(preset);
}

/** The absolute link that repeats this run, given the practice page's URL. */
export function retryUrl(pageUrl: string, run: RunRecord): string | null {
  const query = retryQuery(run);
  if (query === null) return null;
  const url = new URL(pageUrl);
  url.search = query;
  return url.toString();
}
