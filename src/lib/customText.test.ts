import { describe, expect, it } from "vitest";

import { createSession, reduce, sessionStats } from "../engine/session";
import { wordsOf } from "../engine/text/provider";
import { splitClusters } from "../engine/unicode";
import {
  CUSTOM_MAX_WORDS,
  CUSTOM_MIN_CHARS,
  CUSTOM_TEXT_KEY,
  checkCustomText,
  cleanCustomText,
  clearCustomText,
  customPracticeText,
  loadCustomText,
  parseStoredCustomText,
  saveCustomText,
} from "./customText";
import { applyBackup, createBackup, parseBackup, resetAll } from "./progress";
import { createMemoryStorage, type StorageAdapter } from "./storage";

/** A paste that passes every rule. */
const GOOD = "আমি বাংলা টাইপ করতে শিখছি";

describe("cleanCustomText", () => {
  it("collapses whitespace, newlines included, and trims", () => {
    expect(cleanCustomText("  আমি\n\nবাংলা\tলিখতে   শিখছি \r\n")).toBe("আমি বাংলা লিখতে শিখছি");
  });

  it("normalizes nukta forms so either spelling compares equal", () => {
    // ড় arrives either precomposed or as ড + nukta; after NFC both are the pair.
    expect(cleanCustomText("\u09dc")).toBe(cleanCustomText("\u09a1\u09bc"));
    expect(cleanCustomText("\u09dc")).not.toBe("\u09dc");
  });

  it("returns an empty string for anything that is not text", () => {
    expect(cleanCustomText(undefined as unknown as string)).toBe("");
    expect(cleanCustomText("")).toBe("");
    expect(cleanCustomText("   \n ")).toBe("");
  });
});

describe("checkCustomText", () => {
  it("accepts a normal paste and counts it", () => {
    const check = checkCustomText(GOOD);
    expect(check.ok).toBe(true);
    expect(check.problems).toEqual([]);
    expect(check.words).toBe(5);
    expect(check.chars).toBe(Array.from(GOOD).length);
  });

  it("asks for text when there is none", () => {
    const check = checkCustomText("   ");
    expect(check.problems).toEqual(["empty"]);
    expect(check.ok).toBe(false);
  });

  it("names Latin letters as their own problem", () => {
    const check = checkCustomText("ami bangla likhi");
    expect(check.problems).toEqual(["latin"]);
  });

  it("rejects ASCII digits, emoji and other non-Bangla characters", () => {
    expect(checkCustomText("আমি 20 বছর").problems).toContain("notBangla");
    expect(checkCustomText("আমি ভালো আছি 😀").problems).toContain("notBangla");
  });

  it("rejects a paste that is too short", () => {
    const check = checkCustomText("আমি");
    expect(check.chars).toBeLessThan(CUSTOM_MIN_CHARS);
    expect(check.problems).toContain("tooShort");
    expect(check.ok).toBe(false);
  });

  it("rejects a paste that is too long", () => {
    const check = checkCustomText("ক".repeat(1201));
    expect(check.problems).toContain("tooLong");
    expect(check.ok).toBe(false);
  });

  it("rejects a word count outside the limit", () => {
    expect(checkCustomText("বাংলাদেশ আমার").problems).toEqual(["wordRange"]);
    expect(checkCustomText(Array.from({ length: CUSTOM_MAX_WORDS + 1 }, () => "বাংলা").join(" ")).problems).toContain(
      "wordRange",
    );
  });

  it("reports every problem at once, not only the first", () => {
    const check = checkCustomText("ami");
    expect(check.problems).toEqual(expect.arrayContaining(["latin", "tooShort", "wordRange"]));
  });
});

describe("customPracticeText", () => {
  it("shapes a paste like a practice text, without pretending it was reviewed content", () => {
    const item = customPracticeText(`  ${GOOD}  `);
    expect(item.id).toBe("custom");
    expect(item.text).toBe(GOOD);
    expect(item.source).toBe("custom");
    expect(item.topic).toBe("custom");
  });

  it("produces a target the session can actually run and score", () => {
    const item = customPracticeText(GOOD);
    const targetWords = wordsOf(item);
    let session = createSession({ targetWords, durationMs: null });

    targetWords.forEach((word, index) => {
      for (const cluster of splitClusters(word)) {
        session = reduce(session, { type: "input", text: cluster, at: 1000 + index });
      }
      session = reduce(session, { type: "commit", at: 1000 + index });
    });

    const stats = sessionStats(session, 2000);
    expect(session.state).toBe("finished");
    expect(stats.correctWords).toBe(targetWords.length);
    expect(stats.accuracy).toBe(100);
  });
});

describe("custom text storage", () => {
  it("round-trips the cleaned text", () => {
    const storage = createMemoryStorage();
    const stored = saveCustomText(` ${GOOD}\n`, 777, storage);

    expect(stored).toEqual({ text: GOOD, savedAt: 777 });
    expect(loadCustomText(storage)).toEqual({ text: GOOD, savedAt: 777 });
  });

  it("refuses to store a paste that does not validate", () => {
    const storage = createMemoryStorage();
    expect(saveCustomText("ami", 1, storage)).toBeNull();
    expect(loadCustomText(storage)).toBeNull();
  });

  it("reports a refused write instead of throwing", () => {
    const refusing: StorageAdapter = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
      removeItem: () => {},
    };

    expect(saveCustomText(GOOD, 1, refusing)).toBeNull();
  });

  it("forgets the text on request", () => {
    const storage = createMemoryStorage();
    saveCustomText(GOOD, 1, storage);
    clearCustomText(storage);
    expect(loadCustomText(storage)).toBeNull();
  });

  it("ignores broken JSON", () => {
    const storage = createMemoryStorage();
    storage.setItem(CUSTOM_TEXT_KEY, "{not json");
    expect(loadCustomText(storage)).toBeNull();
  });

  it("drops a stored value that no longer validates", () => {
    const storage = createMemoryStorage();
    storage.setItem(CUSTOM_TEXT_KEY, JSON.stringify({ text: "আমি", savedAt: 5 }));
    expect(loadCustomText(storage)).toBeNull();
  });

  it("keeps a missing timestamp from breaking the record", () => {
    expect(parseStoredCustomText({ text: GOOD })).toEqual({ text: GOOD, savedAt: 0 });
    expect(parseStoredCustomText(null)).toBeNull();
    expect(parseStoredCustomText({ text: 42 })).toBeNull();
  });
});

describe("the backup file", () => {
  it("carries the custom text out and back in", () => {
    const from = createMemoryStorage();
    saveCustomText(GOOD, 777, from);

    const backup = createBackup(from);
    expect(backup.customText).toEqual({ text: GOOD, savedAt: 777 });

    const revived = parseBackup(JSON.parse(JSON.stringify(backup)) as unknown);
    if (revived === null) throw new Error("the exported backup did not parse");

    const into = createMemoryStorage();
    applyBackup(revived, into);
    expect(loadCustomText(into)?.text).toBe(GOOD);
  });

  it("reads a file exported before custom text existed as having none", () => {
    const legacy = { ...createBackup(createMemoryStorage()) } as Record<string, unknown>;
    delete legacy.customText;

    expect(parseBackup(legacy)?.customText).toBeNull();
  });

  it("replaces the stored text rather than merging with it", () => {
    const storage = createMemoryStorage();
    saveCustomText(GOOD, 1, storage);

    const backup = { ...createBackup(createMemoryStorage()), customText: null };
    applyBackup(backup, storage);

    expect(loadCustomText(storage)).toBeNull();
  });

  it("goes away with everything else on reset", () => {
    const storage = createMemoryStorage();
    saveCustomText(GOOD, 1, storage);

    resetAll(storage);
    expect(loadCustomText(storage)).toBeNull();
  });
});
