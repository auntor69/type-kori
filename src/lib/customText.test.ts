import { describe, expect, it } from "vitest";

import { createSession, reduce, sessionStats } from "../engine/session";
import { wordsOf } from "../engine/text/provider";
import { splitClusters } from "../engine/unicode";
import {
  CUSTOM_LIBRARY_KEY,
  CUSTOM_LIBRARY_MAX,
  CUSTOM_MAX_WORDS,
  CUSTOM_MIN_CHARS,
  CUSTOM_NAME_MAX,
  CUSTOM_TEXT_KEY,
  addCustomItem,
  activeCustomItem,
  checkCustomText,
  cleanCustomText,
  clearCustomText,
  countDigits,
  countWords,
  customPracticeText,
  customRunOptions,
  emptyLibrary,
  libraryWithText,
  loadCustomLibrary,
  loadCustomText,
  parseCustomLibrary,
  parseStoredCustomText,
  removeCustomItem,
  repairDigits,
  saveCustomLibrary,
  saveCustomText,
  selectCustomItem,
  suggestName,
  type CustomLibrary,
} from "./customText";
import { applyBackup, createBackup, parseBackup, resetAll } from "./progress";
import { createMemoryStorage, type StorageAdapter } from "./storage";

/** A paste that passes every rule. */
const GOOD = "আমি বাংলা টাইপ করতে শিখছি";
const OTHER = "পরীক্ষার প্রশ্ন নম্বর ২৫ সঠিক উত্তর লিখুন";

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
    expect(checkCustomText("ami bangla likhi").problems).toEqual(["latin"]);
  });

  it("accepts digits in either numeral system, and reports how many of each", () => {
    // An exam question carries the date and the marks. Both systems are legal:
    // which one the run uses is the repair step's decision, not the validator's.
    const mixed = checkCustomText("পরীক্ষার তারিখ 25 শে আগস্ট, নম্বর ৮৫ পেয়েছি");
    expect(mixed.problems).toEqual([]);
    expect(mixed.asciiDigits).toBe(2);
    expect(mixed.bengaliDigits).toBe(2);

    // A numeral on its own is not a script slip, but the letters still are.
    expect(checkCustomText("ami 20 bochor").problems).toEqual(["latin"]);
  });

  it("still rejects emoji and other non-Bangla characters", () => {
    expect(checkCustomText("আমি ভালো আছি 😀").problems).toContain("notBangla");
    expect(checkCustomText("আমি বাংলা লিখি ✓").problems).toContain("notBangla");
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
    expect(
      checkCustomText(Array.from({ length: CUSTOM_MAX_WORDS + 1 }, () => "বাংলা").join(" "))
        .problems,
    ).toContain("wordRange");
  });

  it("reports every problem at once, not only the first", () => {
    const check = checkCustomText("ami");
    expect(check.problems).toEqual(expect.arrayContaining(["latin", "tooShort", "wordRange"]));
  });
});

describe("digits", () => {
  it("counts each system separately", () => {
    expect(countDigits("২৫ and 25")).toEqual({ ascii: 2, bengali: 2 });
    expect(countDigits(GOOD)).toEqual({ ascii: 0, bengali: 0 });
  });

  it("repairs ASCII numerals into Bengali numerals", () => {
    expect(repairDigits("নম্বর 25, তারিখ 2026", "bengali")).toBe("নম্বর ২৫, তারিখ ২০২৬");
  });

  it("repairs Bengali numerals back into ASCII", () => {
    expect(repairDigits("নম্বর ২৫, তারিখ ২০২৬", "ascii")).toBe("নম্বর 25, তারিখ 2026");
  });

  it("leaves the text alone when nobody asked for a repair", () => {
    const text = "নম্বর 25 বনাম ২৫";
    expect(repairDigits(text, "keep")).toBe(text);
  });

  it("touches nothing but the digits", () => {
    const source = "ক খ গ ০ 1 ! @ ।";
    expect(repairDigits(source, "bengali")).toBe("ক খ গ ০ ১ ! @ ।");
    expect(repairDigits(source, "ascii")).toBe("ক খ গ 0 1 ! @ ।");
  });

  it("does not change the length or the word count, so validation is unaffected", () => {
    const before = checkCustomText("পরীক্ষার প্রশ্ন নম্বর ২৫ সঠিক উত্তর লিখুন");
    const repaired = checkCustomText(repairDigits(before.text, "ascii"));
    expect(repaired.chars).toBe(before.chars);
    expect(repaired.words).toBe(before.words);
    expect(repaired.ok).toBe(true);
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

describe("bounded custom runs", () => {
  it("runs to the end of the passage when nothing is asked for", () => {
    expect(customRunOptions({})).toEqual({ durationMs: null, wordGoal: null });
    expect(customRunOptions({ durationSeconds: null, wordGoal: null })).toEqual({
      durationMs: null,
      wordGoal: null,
    });
  });

  it("turns seconds into milliseconds for a timed run", () => {
    expect(customRunOptions({ durationSeconds: 30 })).toEqual({ durationMs: 30_000, wordGoal: null });
  });

  it("keeps a word goal and drops the timer, because only one can apply", () => {
    expect(customRunOptions({ durationSeconds: 60, wordGoal: 25 })).toEqual({
      durationMs: null,
      wordGoal: 25,
    });
  });

  it("ignores a value that could not start a run", () => {
    expect(customRunOptions({ durationSeconds: 0, wordGoal: -5 })).toEqual({
      durationMs: null,
      wordGoal: null,
    });
    expect(customRunOptions({ durationSeconds: Number.NaN })).toEqual({
      durationMs: null,
      wordGoal: null,
    });
  });

  it("clamps a goal to the passage limits, so a typed-in link cannot exceed them", () => {
    expect(customRunOptions({ wordGoal: 9999 }).wordGoal).toBe(CUSTOM_MAX_WORDS);
    expect(customRunOptions({ durationSeconds: 9999 }).durationMs).toBe(3600_000);
  });

  it("counts the words of a stored text for the library list", () => {
    expect(countWords(GOOD)).toBe(5);
    expect(countWords(`  ${GOOD}\n${GOOD}  `)).toBe(10);
    expect(countWords("")).toBe(0);
  });
});

describe("naming a paste", () => {
  it("names it after its first few words", () => {
    expect(suggestName(GOOD)).toBe("আমি বাংলা টাইপ করতে");
    expect(suggestName(GOOD, 2)).toBe("আমি বাংলা");
  });

  it("never returns an empty name", () => {
    expect(suggestName("")).toBe("0 characters");
    expect(suggestName("আমি")).toBe("আমি");
  });

  it("caps a long name by code point, so a Bangla word is not cut in half", () => {
    const name = suggestName("ক".repeat(50), 1);
    expect(Array.from(name)).toHaveLength(32);
  });
});

describe("the library", () => {
  it("adds a paste, naming it when nobody did", () => {
    const added = addCustomItem(emptyLibrary(), { text: GOOD, savedAt: 500 });
    expect(added?.item.name).toBe("আমি বাংলা টাইপ করতে");
    expect(added?.library.items).toHaveLength(1);
    // The item just added is the active one: the learner is about to practise it.
    expect(added?.library.activeId).toBe(added?.item.id);
  });

  it("keeps a name the learner typed, trimmed and capped", () => {
    const added = addCustomItem(emptyLibrary(), {
      text: GOOD,
      name: "  পরীক্ষার    উত্তর  ",
      savedAt: 1,
    });
    expect(added?.item.name).toBe("পরীক্ষার উত্তর");

    const long = addCustomItem(emptyLibrary(), { text: GOOD, name: "ক".repeat(60), savedAt: 1 });
    expect(Array.from(long?.item.name ?? "")).toHaveLength(CUSTOM_NAME_MAX);
  });

  it("updates the same paste instead of adding it twice", () => {
    const first = addCustomItem(emptyLibrary(), { text: GOOD, savedAt: 1 });
    if (first === null) throw new Error("the first item did not store");

    const again = addCustomItem(first.library, { text: ` ${GOOD} `, name: "নতুন নাম", savedAt: 9 });
    expect(again?.library.items).toHaveLength(1);
    expect(again?.item.id).toBe(first.item.id);
    expect(again?.item.name).toBe("নতুন নাম");
    expect(again?.item.savedAt).toBe(9);
  });

  it("puts the newest paste first", () => {
    const first = addCustomItem(emptyLibrary(), { text: GOOD, savedAt: 1 });
    const second = addCustomItem(first?.library ?? emptyLibrary(), { text: OTHER, savedAt: 2 });
    expect(second?.library.items.map((item) => item.text)).toEqual([OTHER, GOOD]);
  });

  it("refuses a paste that does not validate", () => {
    expect(addCustomItem(emptyLibrary(), { text: "ami" })).toBeNull();
  });

  it("stops at the cap, but still re-saves what is already inside", () => {
    let library: CustomLibrary = emptyLibrary();
    for (let index = 0; index < CUSTOM_LIBRARY_MAX; index += 1) {
      const text = `${GOOD} নম্বর ${index}`;
      const added = addCustomItem(library, { text, savedAt: index + 1 });
      if (added === null) throw new Error(`item ${index} did not store`);
      library = added.library;
    }

    expect(addCustomItem(library, { text: `${GOOD} নতুন একটা পাঠ`, savedAt: 99 })).toBeNull();

    // Re-saving an existing paste must still work: the cap is on new texts, or
    // the twentieth item would freeze the library.
    const existing = library.items[0];
    const renamed = addCustomItem(library, { text: existing.text, name: "পুরোনো", savedAt: 100 });
    expect(renamed?.item.id).toBe(existing.id);
    expect(renamed?.item.name).toBe("পুরোনো");
  });

  it("forgets an item and moves the active mark off it", () => {
    const first = addCustomItem(emptyLibrary(), { text: GOOD, savedAt: 1 });
    const second = addCustomItem(first?.library ?? emptyLibrary(), { text: OTHER, savedAt: 2 });
    const library = second?.library ?? emptyLibrary();
    const removed = removeCustomItem(library, second?.item.id ?? "");

    expect(removed.items.map((item) => item.text)).toEqual([GOOD]);
    expect(removed.activeId).toBe(first?.item.id);
    expect(activeCustomItem(removed)?.text).toBe(GOOD);
  });

  it("only marks an item that exists as active", () => {
    const library = addCustomItem(emptyLibrary(), { text: GOOD, savedAt: 1 })?.library ?? emptyLibrary();
    expect(selectCustomItem(library, "not-an-id").activeId).toBeNull();
    expect(selectCustomItem(library, library.items[0].id).activeId).toBe(library.items[0].id);
    expect(selectCustomItem(library, null).activeId).toBeNull();
  });

  it("drops what no longer validates when reading the stored list", () => {
    const parsed = parseCustomLibrary({
      items: [
        { id: "a", name: "ঠিক", text: GOOD, savedAt: 5 },
        { id: "a", name: "ডুপ্লিকেট", text: OTHER, savedAt: 6 },
        { id: "b", name: "ভুল", text: "ami bangla", savedAt: 1 },
        { id: "c", text: GOOD, savedAt: 7 },
        "not an item",
      ],
      activeId: "b",
    });

    expect(parsed?.items.map((item) => item.name)).toEqual(["ঠিক", "আমি বাংলা টাইপ করতে"]);
    // The active mark pointed at a dropped item, so it falls back to the first.
    expect(parsed?.activeId).toBe("a");
  });

  it("reads a missing or malformed library as nothing stored", () => {
    expect(parseCustomLibrary(null)).toBeNull();
    expect(parseCustomLibrary({ activeId: "x" })).toBeNull();
    expect(parseCustomLibrary("nope")).toBeNull();
  });

  it("round-trips through storage", () => {
    const storage = createMemoryStorage();
    const library = libraryWithText(GOOD, 777);
    if (library === null) throw new Error("the library did not build");

    expect(saveCustomLibrary(library, storage)).toBe(true);
    expect(loadCustomLibrary(storage)).toEqual(library);
  });

  it("keeps a paste saved before the library existed", () => {
    const storage = createMemoryStorage();
    storage.setItem(CUSTOM_TEXT_KEY, JSON.stringify({ text: GOOD, savedAt: 42 }));

    const library = loadCustomLibrary(storage);
    expect(library.items).toHaveLength(1);
    expect(library.items[0].text).toBe(GOOD);
    expect(library.items[0].savedAt).toBe(42);
    // The migration is written through, and the old key is let go: it happens once.
    expect(storage.getItem(CUSTOM_LIBRARY_KEY)).not.toBeNull();
    expect(storage.getItem(CUSTOM_TEXT_KEY)).toBeNull();
    expect(loadCustomLibrary(storage).items).toHaveLength(1);
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
    expect(loadCustomLibrary(storage).items).toEqual([]);
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

  it("reads the most recent paste in the old single-text shape", () => {
    const storage = createMemoryStorage();
    saveCustomText(GOOD, 1, storage);
    saveCustomText(OTHER, 2, storage);
    expect(loadCustomText(storage)).toEqual({ text: OTHER, savedAt: 2 });
  });
});

describe("the backup file", () => {
  it("carries the whole library out and back in", () => {
    const from = createMemoryStorage();
    saveCustomText(GOOD, 777, from);
    saveCustomText(OTHER, 778, from);

    const backup = createBackup(from);
    expect(backup.customLibrary?.items).toHaveLength(2);

    const revived = parseBackup(JSON.parse(JSON.stringify(backup)) as unknown);
    if (revived === null) throw new Error("the exported backup did not parse");

    const into = createMemoryStorage();
    applyBackup(revived, into);
    expect(loadCustomLibrary(into).items.map((item) => item.text)).toEqual([OTHER, GOOD]);
  });

  it("migrates a file that predates the library", () => {
    const older = createBackup(createMemoryStorage()) as unknown as Record<string, unknown>;
    delete older.customLibrary;
    older.customText = { text: GOOD, savedAt: 777 };

    const parsed = parseBackup(older);
    expect(parsed?.customLibrary).toBeNull();

    const into = createMemoryStorage();
    if (parsed !== null) applyBackup(parsed, into);
    expect(loadCustomLibrary(into).items[0].text).toBe(GOOD);
  });

  it("reads a file exported before custom text existed as having none", () => {
    const legacy = { ...createBackup(createMemoryStorage()) } as Record<string, unknown>;
    delete legacy.customText;
    delete legacy.customLibrary;

    expect(parseBackup(legacy)?.customText).toBeNull();
    expect(parseBackup(legacy)?.customLibrary).toBeNull();
  });

  it("replaces the stored text rather than merging with it", () => {
    const storage = createMemoryStorage();
    saveCustomText(GOOD, 1, storage);

    const backup = { ...createBackup(createMemoryStorage()), customText: null, customLibrary: null };
    applyBackup(backup, storage);

    expect(loadCustomText(storage)).toBeNull();
  });

  it("goes away with everything else on reset", () => {
    const storage = createMemoryStorage();
    saveCustomText(GOOD, 1, storage);

    resetAll(storage);
    expect(loadCustomText(storage)).toBeNull();
    expect(loadCustomLibrary(storage).items).toEqual([]);
  });
});
