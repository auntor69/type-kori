import { describe, expect, it } from "vitest";

import type { WordResult } from "../engine/compare";
import {
  BACKUP_APP,
  BACKUP_VERSION,
  ERROR_MAP_KEY,
  RUNS_KEY,
  RUN_LIMIT,
  appendRun,
  applyBackup,
  averageAccuracy,
  backupFileName,
  bestWpm,
  createBackup,
  errorMapForRun,
  loadErrorMap,
  loadRuns,
  mergeErrorMap,
  mostMissed,
  newRunId,
  parseBackup,
  parseBackupText,
  parseErrorMap,
  parseRun,
  parseRuns,
  recordRun,
  resetAll,
  saveErrorMap,
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
    saveSettings({ ...defaultSettings, theme: "dark", fontSize: 34 }, storage);
    saveRuns([makeRun({ id: "kept" })], storage);
    saveErrorMap({ "কা": { missed: 1, seen: 2 } }, storage);
    return storage;
  }

  it("collects the whole app state", () => {
    const backup = createBackup(seededStorage());

    expect(backup.app).toBe(BACKUP_APP);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.settings.theme).toBe("dark");
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
    expect(backup?.exportedAt).toBe(0);
  });

  it("writes a backup over the current state", () => {
    const target = createMemoryStorage();
    const backup = parseBackup({
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: 42,
      settings: { theme: "light" },
      runs: [makeRun({ id: "imported" })],
      errorMap: { "খ": { missed: 1, seen: 1 } },
    });

    expect(backup).not.toBeNull();
    expect(applyBackup(backup as NonNullable<typeof backup>, target)).toBe(true);
    expect(loadSettings(target).theme).toBe("light");
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
    expect(storage.getItem(RUNS_KEY)).toBeNull();
    expect(storage.getItem(ERROR_MAP_KEY)).toBeNull();
  });
});
