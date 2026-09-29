import { describe, expect, it } from "vitest";

import type { WordResult } from "../engine/compare";
import {
  BACKUP_APP,
  BACKUP_VERSION,
  ERROR_MAP_KEY,
  LESSONS_KEY,
  RUNS_KEY,
  RUN_LIMIT,
  appendRun,
  applyBackup,
  averageAccuracy,
  backupFileName,
  bestWpm,
  clusterHeat,
  createBackup,
  errorMapForRun,
  loadErrorMap,
  loadLessonProgress,
  loadRuns,
  mergeErrorMap,
  mostMissed,
  newRunId,
  parseBackup,
  parseBackupText,
  parseErrorMap,
  parseLessonProgress,
  parseRun,
  parseRuns,
  personalBests,
  recordLessonResult,
  recordRun,
  resetAll,
  saveErrorMap,
  saveLessonProgress,
  saveRuns,
  totalTypingMs,
  wpmSeries,
  type RunRecord,
} from "./progress";
import { createMemoryStorage } from "./storage";
import { defaultSettings, loadSettings, saveSettings } from "./settings";

function makeRun(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "run-1",
    ts: 1_700_000_000_000,
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

function manyRuns(count: number): RunRecord[] {
  return Array.from({ length: count }, (_value, index) =>
    makeRun({ id: `r${index}`, ts: 1_700_000_000_000 + index }),
  );
}

describe("parseRun", () => {
  it("accepts a complete record and keeps its fields", () => {
    const run = makeRun({ errors: [{ expected: "কা", typed: "ক" }] });
    expect(parseRun(JSON.parse(JSON.stringify(run)))).toEqual(run);
  });

  it("drops a record with any field missing or wrong", () => {
    expect(parseRun(null)).toBeNull();
    expect(parseRun("nope")).toBeNull();
    expect(parseRun({})).toBeNull();
    expect(parseRun(makeRun({ id: "" }))).toBeNull();
    expect(parseRun(makeRun({ ts: Number.NaN }))).toBeNull();
    expect(parseRun(makeRun({ mode: "handwriting" as RunRecord["mode"] }))).toBeNull();
    expect(parseRun(makeRun({ textId: "" }))).toBeNull();
    expect(parseRun(makeRun({ wpm: "fast" as unknown as number }))).toBeNull();
    expect(parseRun(makeRun({ accuracy: Number.POSITIVE_INFINITY }))).toBeNull();
    expect(parseRun(makeRun({ durationMs: -1 }))).toBeNull();
  });

  it("keeps only well-formed mistakes", () => {
    const run = parseRun(makeRun({ errors: "nope" as unknown as RunRecord["errors"] }));
    expect(run?.errors).toEqual([]);

    const mixed = parseRun(
      makeRun({
        errors: [
          { expected: "কা", typed: "ক" },
          { expected: "কা" } as unknown as { expected: string; typed: string },
          "nope" as unknown as { expected: string; typed: string },
        ],
      }),
    );
    expect(mixed?.errors).toEqual([{ expected: "কা", typed: "ক" }]);
  });
});

describe("parseRuns", () => {
  it("returns nothing for a value that is not an array", () => {
    expect(parseRuns(null)).toEqual([]);
    expect(parseRuns({ runs: [] })).toEqual([]);
  });

  it("keeps the valid records in order and drops the rest", () => {
    const runs = parseRuns([makeRun({ id: "a" }), "nope", makeRun({ id: "b" })]);
    expect(runs.map((run) => run.id)).toEqual(["a", "b"]);
  });

  it("caps the history at the stored limit", () => {
    expect(parseRuns(manyRuns(RUN_LIMIT + 100))).toHaveLength(RUN_LIMIT);
  });
});

describe("run history", () => {
  it("round-trips through storage", () => {
    const storage = createMemoryStorage();
    const runs = manyRuns(3);

    expect(saveRuns(runs, storage)).toBe(true);
    expect(loadRuns(storage)).toEqual(runs);
  });

  it("returns an empty history when the key is absent or corrupt", () => {
    expect(loadRuns(createMemoryStorage())).toEqual([]);
    expect(loadRuns({
      getItem: () => "{oops",
      setItem: () => undefined,
      removeItem: () => undefined,
    })).toEqual([]);
  });

  it("adds a new run at the front and keeps the cap", () => {
    const storage = createMemoryStorage();
    saveRuns(manyRuns(RUN_LIMIT), storage);

    const runs = appendRun(makeRun({ id: "new" }), storage);

    expect(runs).toHaveLength(RUN_LIMIT);
    expect(runs[0].id).toBe("new");
    expect(runs[RUN_LIMIT - 1].id).toBe(`r${RUN_LIMIT - 2}`);
    expect(loadRuns(storage)[0].id).toBe("new");
  });

  it("records a run and its error map together", () => {
    const storage = createMemoryStorage();
    const committed: WordResult[] = [{ target: "কাজ", typed: "কজ", correct: false }];

    recordRun(makeRun({ id: "first" }), committed, storage);

    expect(loadRuns(storage).map((run) => run.id)).toEqual(["first"]);
    expect(loadErrorMap(storage)).toEqual({
      "কা": { missed: 1, seen: 1 },
      "জ": { missed: 0, seen: 1 },
    });
  });

  it("mints run ids that do not collide", () => {
    expect(newRunId(1)).not.toBe(newRunId(1));
  });
});

describe("the error map", () => {
  it("counts seen and missed clusters per target word", () => {
    const committed: WordResult[] = [
      { target: "কাজ", typed: "কাজ", correct: true },
      { target: "কাজ", typed: "কজ", correct: false },
    ];

    expect(errorMapForRun(committed)).toEqual({
      "কা": { missed: 1, seen: 2 },
      "জ": { missed: 0, seen: 2 },
    });
  });

  it("only scores the target clusters, never a typed cluster past the end", () => {
    const committed: WordResult[] = [{ target: "কা", typed: "কাজ", correct: false }];
    expect(errorMapForRun(committed)).toEqual({ "কা": { missed: 0, seen: 1 } });
  });

  it("merges without mutating either map", () => {
    const base = { "কা": { missed: 1, seen: 2 }, "জ": { missed: 0, seen: 2 } };
    const extra = { "কা": { missed: 2, seen: 3 }, "খ": { missed: 1, seen: 1 } };

    expect(mergeErrorMap(base, extra)).toEqual({
      "কা": { missed: 3, seen: 5 },
      "জ": { missed: 0, seen: 2 },
      "খ": { missed: 1, seen: 1 },
    });
    expect(base["কা"]).toEqual({ missed: 1, seen: 2 });
    expect(extra["কা"]).toEqual({ missed: 2, seen: 3 });
  });

  it("drops junk and clamps counts", () => {
    expect(parseErrorMap(null)).toEqual({});
    expect(parseErrorMap({ "": { missed: 1, seen: 1 } })).toEqual({});
    expect(parseErrorMap({ "খ": "nope", "গ": { missed: "x", seen: 1 }, "ঘ": null })).toEqual({});
    expect(parseErrorMap({ "ঙ": { missed: -3.4, seen: 2.6 } })).toEqual({
      "ঙ": { missed: 0, seen: 3 },
    });
  });

  it("round-trips through storage", () => {
    const storage = createMemoryStorage();
    expect(saveErrorMap({ "কা": { missed: 1, seen: 2 } }, storage)).toBe(true);
    expect(loadErrorMap(storage)).toEqual({ "কা": { missed: 1, seen: 2 } });
    expect(loadErrorMap(createMemoryStorage())).toEqual({});
  });

  it("lists the most missed clusters, worst first and never zero-miss ones", () => {
    const map = {
      "কা": { missed: 2, seen: 3 },
      "খ": { missed: 5, seen: 6 },
      "জ": { missed: 0, seen: 4 },
      "গ": { missed: 2, seen: 9 },
    };

    // Two clusters were missed twice; the one seen more often is listed first.
    expect(mostMissed(map).map((entry) => entry.cluster)).toEqual(["খ", "গ", "কা"]);
    expect(mostMissed(map, 1)).toEqual([{ cluster: "খ", missed: 5, seen: 6 }]);
    expect(mostMissed({})).toEqual([]);
  });
});

describe("lesson progress", () => {
  it("drops junk and keeps well-formed records", () => {
    expect(parseLessonProgress(null)).toEqual({});
    expect(parseLessonProgress({ "": { bestAccuracy: 90, bestWpm: 10 } })).toEqual({});
    expect(parseLessonProgress({ "lesson-01": "nope" })).toEqual({});
    expect(parseLessonProgress({ "lesson-01": { bestAccuracy: "high", bestWpm: 10 } })).toEqual({});

    expect(parseLessonProgress({ "lesson-01": { bestAccuracy: 90, bestWpm: 12 } })).toEqual({
      "lesson-01": { bestAccuracy: 90, bestWpm: 12, completedAt: null },
    });
  });

  it("round-trips through storage", () => {
    const storage = createMemoryStorage();
    const record = { "lesson-01": { bestAccuracy: 94, bestWpm: 18, completedAt: 42 } };

    expect(saveLessonProgress(record, storage)).toBe(true);
    expect(loadLessonProgress(storage)).toEqual(record);
    expect(loadLessonProgress(createMemoryStorage())).toEqual({});
  });

  it("keeps the best numbers and stamps completion only once", () => {
    const storage = createMemoryStorage();

    recordLessonResult(
      "lesson-01",
      { accuracy: 70, wpm: 9, passed: false, at: 100 },
      storage,
    );
    expect(loadLessonProgress(storage)["lesson-01"]).toEqual({
      bestAccuracy: 70,
      bestWpm: 9,
      completedAt: null,
    });

    recordLessonResult("lesson-01", { accuracy: 95, wpm: 14, passed: true, at: 200 }, storage);
    recordLessonResult("lesson-01", { accuracy: 88, wpm: 21, passed: false, at: 300 }, storage);

    // Accuracy keeps the best, speed keeps the best, and the completion stamp from
    // the first pass survives a slower run afterwards.
    expect(loadLessonProgress(storage)["lesson-01"]).toEqual({
      bestAccuracy: 95,
      bestWpm: 21,
      completedAt: 200,
    });
  });
});

describe("aggregates", () => {
  const runs = [
    makeRun({ wpm: 20, accuracy: 90, durationMs: 1_000 }),
    makeRun({ wpm: 40, accuracy: 95, durationMs: 2_000 }),
    makeRun({ wpm: 30, accuracy: 100, durationMs: 3_000 }),
  ];

  it("finds the best speed and the average accuracy", () => {
    expect(bestWpm(runs)).toBe(40);
    expect(averageAccuracy(runs)).toBe(95);
    expect(bestWpm([])).toBe(0);
    expect(averageAccuracy([])).toBe(0);
  });

  it("rounds the average accuracy to one decimal", () => {
    expect(averageAccuracy([makeRun({ accuracy: 90 }), makeRun({ accuracy: 95.5 })])).toBe(92.8);
  });

  it("adds up the typing time", () => {
    expect(totalTypingMs(runs)).toBe(6_000);
    expect(totalTypingMs([])).toBe(0);
  });

  it("plots the newest runs oldest first", () => {
    expect(wpmSeries(runs)).toEqual([30, 40, 20]);
    // Only the two newest runs, still oldest first.
    expect(wpmSeries(runs, 2)).toEqual([40, 20]);
    expect(wpmSeries([])).toEqual([]);
  });
});

describe("the backup file", () => {
  function seededStorage() {
    const storage = createMemoryStorage();
    saveSettings({ ...defaultSettings, theme: "serika", fontSize: 34 }, storage);
    saveRuns([makeRun({ id: "kept" })], storage);
    saveErrorMap({ "কা": { missed: 1, seen: 2 } }, storage);
    return storage;
  }

  it("collects the whole app state", () => {
    const backup = createBackup(seededStorage());

    expect(backup.app).toBe(BACKUP_APP);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.settings.theme).toBe("serika");
    expect(backup.runs.map((run) => run.id)).toEqual(["kept"]);
    expect(backup.errorMap).toEqual({ "কা": { missed: 1, seen: 2 } });
  });

  it("round-trips through the file format", () => {
    const backup = createBackup(seededStorage());
    expect(parseBackupText(JSON.stringify(backup))).toEqual(backup);
  });

  it("rejects a file that is not ours, or is a newer schema", () => {
    expect(parseBackup(null)).toBeNull();
    expect(parseBackup({ app: "another-app", version: 1 })).toBeNull();
    expect(parseBackup({ app: BACKUP_APP, version: BACKUP_VERSION + 1 })).toBeNull();
    expect(parseBackupText("{not json")).toBeNull();
  });

  it("repairs a partial file instead of failing", () => {
    const backup = parseBackup({ app: BACKUP_APP, version: BACKUP_VERSION });

    expect(backup).not.toBeNull();
    expect(backup?.settings).toEqual(defaultSettings);
    expect(backup?.runs).toEqual([]);
    expect(backup?.errorMap).toEqual({});
    expect(backup?.lessons).toEqual({});
    expect(backup?.exportedAt).toBe(0);
  });

  it("carries lesson progress, and restores it", () => {
    const source = seededStorage();
    saveLessonProgress({ "lesson-01": { bestAccuracy: 96, bestWpm: 20, completedAt: 7 } }, source);

    expect(createBackup(source).lessons).toEqual({
      "lesson-01": { bestAccuracy: 96, bestWpm: 20, completedAt: 7 },
    });

    const target = createMemoryStorage();
    const backup = parseBackup(JSON.parse(JSON.stringify(createBackup(source))) as unknown);
    expect(backup).not.toBeNull();
    applyBackup(backup as NonNullable<typeof backup>, target);

    expect(loadLessonProgress(target)).toEqual({
      "lesson-01": { bestAccuracy: 96, bestWpm: 20, completedAt: 7 },
    });
  });

  it("writes a backup over the current state", () => {
    const target = createMemoryStorage();
    const backup = parseBackup({
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: 42,
      settings: { theme: "paper" },
      runs: [makeRun({ id: "imported" })],
      errorMap: { "খ": { missed: 1, seen: 1 } },
    });

    expect(backup).not.toBeNull();
    expect(applyBackup(backup as NonNullable<typeof backup>, target)).toBe(true);
    expect(loadSettings(target).theme).toBe("paper");
    expect(loadRuns(target).map((run) => run.id)).toEqual(["imported"]);
    expect(loadErrorMap(target)).toEqual({ "খ": { missed: 1, seen: 1 } });
  });

  it("names the file after the export date", () => {
    const now = Date.UTC(2026, 8, 28, 12, 0, 0);
    expect(backupFileName(now)).toBe("type-kori-backup-2026-09-28.json");
  });

  it("clears everything on reset", () => {
    const storage = seededStorage();
    resetAll(storage);

    expect(loadSettings(storage)).toEqual(defaultSettings);
    expect(loadRuns(storage)).toEqual([]);
    expect(loadErrorMap(storage)).toEqual({});
    expect(loadLessonProgress(storage)).toEqual({});
    expect(storage.getItem(RUNS_KEY)).toBeNull();
    expect(storage.getItem(ERROR_MAP_KEY)).toBeNull();
    expect(storage.getItem(LESSONS_KEY)).toBeNull();
  });
});

describe("test type on a run", () => {
  it("keeps a recorded test type", () => {
    expect(parseRun(makeRun({ testType: "time 60" }))?.testType).toBe("time 60");
  });

  it("reads history recorded before test types existed", () => {
    const { testType: _dropped, ...withoutTestType } = makeRun();
    expect(parseRun(withoutTestType)?.testType).toBeUndefined();
  });

  it("drops an absurd test type rather than storing it", () => {
    expect(parseRun(makeRun({ testType: "x".repeat(64) }))?.testType).toBeUndefined();
  });
});

describe("personalBests", () => {
  it("groups by test type and keeps the best of each", () => {
    const runs = [
      makeRun({ id: "a", testType: "time 60", wpm: 40, accuracy: 95, ts: 200 }),
      makeRun({ id: "b", testType: "time 60", wpm: 55, accuracy: 97, ts: 100 }),
      makeRun({ id: "c", testType: "words 25", wpm: 30, accuracy: 99, ts: 300 }),
      makeRun({ id: "d", wpm: 10, accuracy: 50, ts: 400 }),
    ];

    const bests = personalBests(runs);
    const time = bests.find((best) => best.testType === "time 60");

    expect(time?.runs).toBe(2);
    expect(time?.bestWpm).toBe(55);
    expect(time?.bestAccuracy).toBe(97);
    // The newest run of that type, not the best one.
    expect(time?.latestWpm).toBe(40);
    expect(bests.map((best) => best.testType).sort()).toEqual(["time 60", "unknown", "words 25"]);
  });

  it("reports nothing without history", () => {
    expect(personalBests([])).toEqual([]);
  });
});

describe("clusterHeat", () => {
  it("sorts by miss rate and ignores clusters seen too rarely", () => {
    const heat = clusterHeat({
      ক: { missed: 3, seen: 100 },
      খ: { missed: 2, seen: 4 },
      গ: { missed: 1, seen: 3 },
      ঘ: { missed: 4, seen: 2 },
      ঙ: { missed: 0, seen: 50 },
    });

    expect(heat.map((entry) => entry.cluster)).toEqual(["খ", "গ", "ক"]);
    expect(heat[0].rate).toBeCloseTo(0.5);
    expect(heat[0].seen).toBe(4);
  });

  it("respects its limit", () => {
    const map = Object.fromEntries(
      Array.from({ length: 40 }, (_value, index) => [`ক${index}`, { missed: 2, seen: 5 }]),
    );
    expect(clusterHeat(map, 3, 10).length).toBe(10);
  });
});
