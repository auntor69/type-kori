/**
 * Run history, the error map and the backup file.
 *
 * Section 9 of docs/MASTERPLAN.md fixes the storage keys and the shape of a run.
 * This module is the only place that knows them, so the typing island records a
 * finished run in one call and the progress page reads validated data or nothing.
 */

import { clustersOf, type WordResult } from "../engine/compare";
import type { InputEngineId } from "../engine/input/types";
import {
  clearCustomText,
  loadCustomText,
  parseStoredCustomText,
  saveCustomText,
  type StoredCustomText,
} from "./customText";
import { loadSettings, parseSettings, saveSettings, type Settings } from "./settings";
import {
  STORAGE_PREFIX,
  availableStorage,
  clearAppStorage,
  readJson,
  writeJson,
  type StorageAdapter,
} from "./storage";

export const RUNS_KEY = `${STORAGE_PREFIX}runs`;
export const ERROR_MAP_KEY = `${STORAGE_PREFIX}errorMap`;

/** Section 9 caps the history at the most recent 500 runs. */
export const RUN_LIMIT = 500;

/** One mistake, as the run summary prints it. */
export interface RunError {
  expected: string;
  typed: string;
}

/** A finished run. Newest runs come first. */
export interface RunRecord {
  id: string;
  ts: number;
  mode: InputEngineId;
  textId: string;
  wpm: number;
  kpm: number;
  accuracy: number;
  /** Time actually spent typing, not the timer the run was started with. */
  durationMs: number;
  errors: RunError[];
  /**
   * Which test produced the run, e.g. `time 60`, `words 25`, `∞` or `lesson`.
   * Optional because history recorded before personal bests existed has none.
   */
  testType?: string;
}

/** How often one target cluster was typed and how often it was missed. */
export interface ClusterStat {
  missed: number;
  seen: number;
}

export type ErrorMap = Record<string, ClusterStat>;

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseRunErrors(raw: unknown): RunError[] {
  if (!Array.isArray(raw)) return [];

  const errors: RunError[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const { expected, typed } = entry as Partial<RunError>;
    if (typeof expected !== "string" || typeof typed !== "string") continue;
    errors.push({ expected, typed });
  }
  return errors;
}

/** Validate one stored run. Anything incomplete means the record is dropped. */
export function parseRun(raw: unknown): RunRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const run = raw as Partial<RunRecord>;

  if (typeof run.id !== "string" || run.id.length === 0) return null;
  if (!isCount(run.ts)) return null;
  if (run.mode !== "system" && run.mode !== "avro-phonetic") return null;
  if (typeof run.textId !== "string" || run.textId.length === 0) return null;
  if (!isCount(run.wpm) || !isCount(run.kpm) || !isCount(run.accuracy)) return null;
  if (!isCount(run.durationMs) || run.durationMs < 0) return null;

  return {
    id: run.id,
    ts: run.ts,
    mode: run.mode,
    textId: run.textId,
    wpm: run.wpm,
    kpm: run.kpm,
    accuracy: run.accuracy,
    durationMs: run.durationMs,
    errors: parseRunErrors(run.errors),
    testType:
      typeof run.testType === "string" && run.testType.length > 0 && run.testType.length <= 32
        ? run.testType
        : undefined,
  };
}

export function parseRuns(raw: unknown): RunRecord[] {
  if (!Array.isArray(raw)) return [];

  const runs: RunRecord[] = [];
  for (const entry of raw) {
    const run = parseRun(entry);
    if (run !== null) runs.push(run);
  }
  return runs.slice(0, RUN_LIMIT);
}

export function loadRuns(storage: StorageAdapter = availableStorage()): RunRecord[] {
  return readJson(RUNS_KEY, parseRuns, storage) ?? [];
}

export function saveRuns(
  runs: readonly RunRecord[],
  storage: StorageAdapter = availableStorage(),
): boolean {
  return writeJson(RUNS_KEY, runs.slice(0, RUN_LIMIT), storage);
}

/** Add a run to the history, newest first, dropping the oldest past the cap. */
export function appendRun(
  run: RunRecord,
  storage: StorageAdapter = availableStorage(),
): RunRecord[] {
  const runs = [run, ...loadRuns(storage)].slice(0, RUN_LIMIT);
  saveRuns(runs, storage);
  return runs;
}

/** A short, sortable, collision-resistant id. Not a UUID, and that is enough. */
export function newRunId(now: number = Date.now()): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseErrorMap(raw: unknown): ErrorMap {
  if (typeof raw !== "object" || raw === null) return {};

  const map: ErrorMap = {};
  for (const [cluster, value] of Object.entries(raw as Record<string, unknown>)) {
    if (cluster.length === 0) continue;
    if (typeof value !== "object" || value === null) continue;

    const stat = value as Partial<ClusterStat>;
    if (!isCount(stat.missed) || !isCount(stat.seen)) continue;
    map[cluster] = {
      missed: Math.max(0, Math.round(stat.missed)),
      seen: Math.max(0, Math.round(stat.seen)),
    };
  }
  return map;
}

export function loadErrorMap(storage: StorageAdapter = availableStorage()): ErrorMap {
  return readJson(ERROR_MAP_KEY, parseErrorMap, storage) ?? {};
}

export function saveErrorMap(
  map: ErrorMap,
  storage: StorageAdapter = availableStorage(),
): boolean {
  return writeJson(ERROR_MAP_KEY, map, storage);
}

/** seen/missed counts for the committed words of one run. */
export function errorMapForRun(committed: readonly WordResult[]): ErrorMap {
  const map: ErrorMap = {};

  for (const word of committed) {
    const target = clustersOf(word.target);
    const typed = clustersOf(word.typed);

    for (let index = 0; index < target.length; index += 1) {
      const cluster = target[index];
      const stat = map[cluster] ?? { missed: 0, seen: 0 };
      stat.seen += 1;
      if (typed[index] !== cluster) stat.missed += 1;
      map[cluster] = stat;
    }
  }

  return map;
}

export function mergeErrorMap(base: ErrorMap, extra: ErrorMap): ErrorMap {
  const map: ErrorMap = {};
  for (const [cluster, stat] of Object.entries(base)) map[cluster] = { ...stat };

  for (const [cluster, stat] of Object.entries(extra)) {
    const current = map[cluster] ?? { missed: 0, seen: 0 };
    map[cluster] = { missed: current.missed + stat.missed, seen: current.seen + stat.seen };
  }

  return map;
}

/**
 * Record a finished run: the history and the error map are updated together, so
 * the progress page can never show a run that the map does not know about.
 * Storage failures are swallowed; the caller has nothing to recover.
 */
export function recordRun(
  run: RunRecord,
  committed: readonly WordResult[],
  storage: StorageAdapter = availableStorage(),
): void {
  appendRun(run, storage);
  saveErrorMap(mergeErrorMap(loadErrorMap(storage), errorMapForRun(committed)), storage);
}

/** The clusters the user mistypes most, worst first. */
export function mostMissed(
  map: ErrorMap,
  limit = 8,
): { cluster: string; missed: number; seen: number }[] {
  return Object.entries(map)
    .map(([cluster, stat]) => ({ cluster, missed: stat.missed, seen: stat.seen }))
    .filter((entry) => entry.missed > 0)
    .sort(
      (a, b) => b.missed - a.missed || b.seen - a.seen || a.cluster.localeCompare(b.cluster),
    )
    .slice(0, limit);
}

export function bestWpm(runs: readonly RunRecord[]): number {
  return runs.reduce((best, run) => Math.max(best, run.wpm), 0);
}

export function averageAccuracy(runs: readonly RunRecord[]): number {
  if (runs.length === 0) return 0;
  const total = runs.reduce((sum, run) => sum + run.accuracy, 0);
  return Math.round((total / runs.length) * 10) / 10;
}

export function totalTypingMs(runs: readonly RunRecord[]): number {
  return runs.reduce((sum, run) => sum + run.durationMs, 0);
}

/**
 * The WPM of the most recent runs, oldest first, so a chart can plot them left
 * to right. The stored history is newest first.
 */
export function wpmSeries(runs: readonly RunRecord[], limit = 30): number[] {
  return runs
    .slice(0, limit)
    .map((run) => run.wpm)
    .reverse();
}

/** One test type's best result, in the spirit of monkeytype's personal bests. */
export interface PersonalBest {
  testType: string;
  runs: number;
  bestWpm: number;
  bestAccuracy: number;
  /** Speed of the most recent run of this type, for a "vs best" comparison. */
  latestWpm: number;
  latestAt: number;
}

export const UNKNOWN_TEST_TYPE = "unknown";

/**
 * Group the history by test type and keep the best of each. Types are ordered by
 * how much they have been practised, then by name, so the list is stable.
 */
export function personalBests(runs: readonly RunRecord[]): PersonalBest[] {
  const groups = new Map<string, PersonalBest>();

  for (const run of runs) {
    const testType = run.testType ?? UNKNOWN_TEST_TYPE;
    const current = groups.get(testType);

    if (current === undefined) {
      groups.set(testType, {
        testType,
        runs: 1,
        bestWpm: run.wpm,
        bestAccuracy: run.accuracy,
        latestWpm: run.wpm,
        latestAt: run.ts,
      });
      continue;
    }

    current.runs += 1;
    current.bestWpm = Math.max(current.bestWpm, run.wpm);
    current.bestAccuracy = Math.max(current.bestAccuracy, run.accuracy);
    if (run.ts > current.latestAt) {
      current.latestAt = run.ts;
      current.latestWpm = run.wpm;
    }
  }

  return [...groups.values()].sort(
    (a, b) => b.runs - a.runs || a.testType.localeCompare(b.testType),
  );
}

/** One cluster's hit rate, for the heat grid. */
export interface ClusterHeat {
  cluster: string;
  missed: number;
  seen: number;
  /** Missed ÷ seen, 0–1. */
  rate: number;
}

/**
 * The clusters worth practising: practised at least `minSeen` times and missed
 * at least once, worst hit rate first. A cluster seen twice and missed twice is
 * a stronger signal than one seen a hundred times and missed three, which is why
 * this sorts by rate rather than by raw count.
 */
export function clusterHeat(map: ErrorMap, minSeen = 3, limit = 24): ClusterHeat[] {
  return Object.entries(map)
    .map(([cluster, stat]) => ({
      cluster,
      missed: stat.missed,
      seen: stat.seen,
      rate: stat.seen > 0 ? stat.missed / stat.seen : 0,
    }))
    .filter((entry) => entry.missed > 0 && entry.seen >= minSeen)
    .sort((a, b) => b.rate - a.rate || b.missed - a.missed || a.cluster.localeCompare(b.cluster))
    .slice(0, limit);
}

export const LESSONS_KEY = `${STORAGE_PREFIX}lessons`;

/** One lesson's best result, as Section 9 sketches it. */
export interface LessonProgress {
  bestAccuracy: number;
  bestWpm: number;
  /** When the pass criterion was first met, or null while it has not been. */
  completedAt: number | null;
}

export type LessonProgressMap = Record<string, LessonProgress>;

export function parseLessonProgress(raw: unknown): LessonProgressMap {
  if (typeof raw !== "object" || raw === null) return {};

  const map: LessonProgressMap = {};
  for (const [lessonId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (lessonId.length === 0) continue;
    if (typeof value !== "object" || value === null) continue;

    const entry = value as Partial<LessonProgress>;
    if (!isCount(entry.bestAccuracy) || !isCount(entry.bestWpm)) continue;
    map[lessonId] = {
      bestAccuracy: Math.max(0, entry.bestAccuracy),
      bestWpm: Math.max(0, entry.bestWpm),
      completedAt: isCount(entry.completedAt) ? entry.completedAt : null,
    };
  }
  return map;
}

export function loadLessonProgress(
  storage: StorageAdapter = availableStorage(),
): LessonProgressMap {
  return readJson(LESSONS_KEY, parseLessonProgress, storage) ?? {};
}

export function saveLessonProgress(
  map: LessonProgressMap,
  storage: StorageAdapter = availableStorage(),
): boolean {
  return writeJson(LESSONS_KEY, map, storage);
}

/**
 * Fold one finished lesson run into the record: keep the better numbers, and stamp
 * `completedAt` the first time the pass criterion is met.
 */
export function recordLessonResult(
  lessonId: string,
  result: { accuracy: number; wpm: number; passed: boolean; at: number },
  storage: StorageAdapter = availableStorage(),
): LessonProgressMap {
  const map = loadLessonProgress(storage);
  const current = map[lessonId];

  map[lessonId] = {
    bestAccuracy: Math.max(current?.bestAccuracy ?? 0, result.accuracy),
    bestWpm: Math.max(current?.bestWpm ?? 0, result.wpm),
    completedAt: current?.completedAt ?? (result.passed ? result.at : null),
  };

  saveLessonProgress(map, storage);
  return map;
}

export const BACKUP_APP = "type-kori";
export const BACKUP_VERSION = 1;

/** The exported JSON file. It is the whole app state, so it can move devices. */
export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number;
  settings: Settings;
  runs: RunRecord[];
  errorMap: ErrorMap;
  lessons: LessonProgressMap;
  /** Text the user pasted for custom practice, if there is one. */
  customText: StoredCustomText | null;
}

export function createBackup(storage: StorageAdapter = availableStorage()): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    settings: loadSettings(storage),
    runs: loadRuns(storage),
    errorMap: loadErrorMap(storage),
    lessons: loadLessonProgress(storage),
    customText: loadCustomText(storage),
  };
}

/**
 * Validate an imported backup. A file from another app, a newer schema or a
 * hand-edited mess all return null, so the caller can say so instead of writing
 * half a state over the user's data.
 */
export function parseBackup(raw: unknown): Backup | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Partial<Backup>;

  if (value.app !== BACKUP_APP) return null;
  if (value.version !== BACKUP_VERSION) return null;

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: isCount(value.exportedAt) ? value.exportedAt : 0,
    settings: parseSettings(value.settings),
    runs: parseRuns(value.runs),
    errorMap: parseErrorMap(value.errorMap),
    // A file exported before lessons existed simply has none, which reads as empty.
    lessons: parseLessonProgress(value.lessons),
    // Same for a file exported before custom text existed: absent reads as none.
    customText: parseStoredCustomText(value.customText),
  };
}

/**
 * Parse the text of an imported file. The text is only ever parsed as JSON; it is
 * never evaluated.
 */
export function parseBackupText(text: string): Backup | null {
  try {
    return parseBackup(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

/**
 * Replace the current state with a validated backup. A backup with no custom
 * text clears the stored one: this function replaces, it does not merge.
 */
export function applyBackup(
  backup: Backup,
  storage: StorageAdapter = availableStorage(),
): boolean {
  const settingsStored = saveSettings(backup.settings, storage);
  const runsStored = saveRuns(backup.runs, storage);
  const mapStored = saveErrorMap(backup.errorMap, storage);
  const lessonsStored = saveLessonProgress(backup.lessons, storage);

  let customStored = true;
  if (backup.customText === null) clearCustomText(storage);
  else if (saveCustomText(backup.customText.text, backup.customText.savedAt, storage) === null) {
    customStored = false;
  }

  return settingsStored && runsStored && mapStored && lessonsStored && customStored;
}

/** Forget everything the app owns, settings included. */
export function resetAll(storage: StorageAdapter = availableStorage()): void {
  clearAppStorage(storage);
}

export function backupFileName(now: number = Date.now()): string {
  return `type-kori-backup-${new Date(now).toISOString().slice(0, 10)}.json`;
}
