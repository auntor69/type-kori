import { describe, expect, it } from "vitest";

import {
  allRuleRows,
  compileRules,
  createPhoneticEngine,
  declaredSources,
  loadGrammar,
  transliterate,
} from "./phonetic";

const grammar = loadGrammar();
const compiled = compileRules(grammar);

/** The app converts one word at a time; spaces never reach the engine. */
const phrase = (text: string) => text.split(" ").map((word) => transliterate(word, { grammar, compiled })).join(" ");

describe("Section 7.6 starter cases", () => {
  // These six are written into docs/MASTERPLAN.md, so they are authoritative for
  // this project rather than our own guesswork.
  it.each([
    ["ami", "আমি"],
    ["amar", "আমার"],
    ["bangla", "বাংলা"],
    ["kaj", "কাজ"],
    ["bhalo", "ভালো"],
  ])("converts %s to %s", (roman, bangla) => {
    expect(transliterate(roman, { grammar, compiled })).toBe(bangla);
  });

  it("converts the starter sentence", () => {
    expect(phrase("ami banglay gan gai")).toBe("আমি বাংলায় গান গাই");
  });
});

describe("cases from the published guide", () => {
  it.each([
    ["tumi", "তুমি"],
    ["achen", "আছেন"],
    ["shikkha", "শিক্ষা"],
  ])("converts %s to %s", (roman, bangla) => {
    expect(transliterate(roman, { grammar, compiled })).toBe(bangla);
  });

  it("converts the guide's second starter sentence", () => {
    expect(phrase("ami bangla gan gai")).toBe("আমি বাংলা গান গাই");
  });
});

/**
 * Known divergences from the reference behaviour.
 *
 * The reference is dictionary-driven: a real Avro dictionary holds about 150,000
 * words and picks the reading that is actually spelled that way. Two Roman words
 * ending in the same letter can need different Bangla, and a rule engine has no
 * way to know which. `kemon` is the example that proves it — the reference
 * writes কেমন with the inherent vowel unwritten, while `bhalo` really is spelled
 * with an explicit ো. Every entry here is a real gap, recorded on purpose so it
 * cannot be mistaken for working behaviour, and listed in docs/VERIFY.md.
 */
const KNOWN_DIVERGENCES = [
  {
    roman: "kemon",
    ours: "কেমোন",
    reference: "কেমন",
    reason: "word-final inherent vowel: the rules spell the o that the dictionary leaves unwritten",
  },
];

describe("known divergences from the reference", () => {
  it.each(KNOWN_DIVERGENCES.map((entry) => [entry.roman, entry.ours, entry.reference]))(
    "documents that %s produces %s rather than %s",
    (roman, ours, reference) => {
      expect(transliterate(roman, { grammar, compiled })).toBe(ours);
      expect(ours).not.toBe(reference);
    },
  );

  it("keeps the divergence list short enough to be honest about", () => {
    // A rule engine cannot match a dictionary word for word. This is a tripwire:
    // if the list grows a lot, the mode is not ready to leave preview.
    expect(KNOWN_DIVERGENCES.length).toBeLessThan(10);
  });
});

describe("the context rule", () => {
  it("uses the sign form after a consonant and the independent form elsewhere", () => {
    // Both come from the starter sentence: ami is মি, gai is গাই.
    expect(transliterate("mi", { grammar, compiled })).toBe("মি");
    expect(transliterate("gai", { grammar, compiled })).toBe("গাই");
    expect(transliterate("ai", { grammar, compiled })).toBe("আই");
  });

  it("always starts a word with the independent form", () => {
    for (const row of grammar.vowels) {
      expect(transliterate(row.latin, { grammar, compiled }), row.latin).toBe(row.independent);
    }
  });
});

describe("longest match wins", () => {
  it("prefers the longer Roman sequence", () => {
    expect(transliterate("k", { grammar, compiled })).toBe("ক");
    expect(transliterate("kh", { grammar, compiled })).toBe("খ");
    expect(transliterate("kkh", { grammar, compiled })).toBe("ক্ষ");
    expect(transliterate("g", { grammar, compiled })).toBe("গ");
    expect(transliterate("gh", { grammar, compiled })).toBe("ঘ");
    expect(transliterate("s", { grammar, compiled })).toBe("স");
    expect(transliterate("sh", { grammar, compiled })).toBe("শ");
    expect(transliterate("ss", { grammar, compiled })).toBe("ষ");
  });

  it("re-resolves when more keys arrive, which is why the word is re-converted", () => {
    const engine = createPhoneticEngine({ grammar, compiled });

    expect(engine.translate({ key: "k" })).toEqual({ type: "compose", text: "ক", composing: "k" });
    expect(engine.translate({ key: "h" })).toEqual({ type: "compose", text: "খ", composing: "kh" });
  });
});

describe("automatic hasanta", () => {
  it("joins two consonants into a conjunct", () => {
    expect(transliterate("tt", { grammar, compiled })).toBe("ত্ত");
    expect(transliterate("kk", { grammar, compiled })).toBe("ক্ক");
    expect(transliterate("nt", { grammar, compiled })).toBe("ন্ত");
  });

  it("does not join across a vowel", () => {
    expect(transliterate("kata", { grammar, compiled })).toBe("কাতা");
  });

  it("uses an explicit hasanta for the backtick rule", () => {
    expect(transliterate("t`", { grammar, compiled })).toBe("ত্");
  });

  it("can be turned off", () => {
    const withoutHasanta = { ...grammar, autoHasanta: false };
    expect(transliterate("tt", { grammar: withoutHasanta, compiled: compileRules(withoutHasanta) })).toBe("তত");
  });
});

describe("digits", () => {
  it("produces Bengali digits", () => {
    for (const row of grammar.digits) {
      expect(transliterate(row.latin, { grammar, compiled }), row.latin).toBe(row.bangla);
    }
  });

  it("can be configured to leave ASCII digits alone", () => {
    const withoutBengaliDigits = { ...grammar, digitsAreBengali: false };
    const withAscii = compileRules(withoutBengaliDigits);
    expect(transliterate("2026", { grammar: withoutBengaliDigits, compiled: withAscii })).toBe("2026");
  });
});

describe("input the grammar does not know", () => {
  it("passes unknown characters through instead of dropping them", () => {
    expect(transliterate("k?", { grammar, compiled })).toBe("ক?");
    expect(transliterate("...", { grammar, compiled })).toBe("...");
    expect(transliterate("", { grammar, compiled })).toBe("");
  });
});

describe("every grammar row", () => {
  it.each(grammar.vowels.map((row) => [row.latin, row.independent, row.sign]))(
    "vowel %s is %s on its own and %s after a consonant",
    (latin, independent, sign) => {
      expect(transliterate(latin, { grammar, compiled })).toBe(independent);
      expect(transliterate(`k${latin}`, { grammar, compiled })).toBe(`ক${sign}`);
    },
  );

  it.each(grammar.consonants.map((row) => [row.latin, row.bangla]))(
    "consonant %s is %s",
    (latin, bangla) => {
      expect(transliterate(latin, { grammar, compiled })).toBe(bangla);
    },
  );

  it.each(grammar.marks.map((row) => [row.latin, row.bangla]))(
    "mark %s is %s",
    (latin, bangla) => {
      expect(transliterate(latin, { grammar, compiled })).toBe(bangla);
    },
  );

  it.each(grammar.conjuncts.map((row) => [row.latin, row.bangla]))(
    "conjunct %s is %s",
    (latin, bangla) => {
      expect(transliterate(latin, { grammar, compiled })).toBe(bangla);
    },
  );

  it.each(grammar.digits.map((row) => [row.latin, row.bangla]))(
    "digit %s is %s",
    (latin, bangla) => {
      expect(transliterate(latin, { grammar, compiled })).toBe(bangla);
    },
  );
});

describe("grammar provenance", () => {
  it("gives every row a declared source", () => {
    const declared = new Set(Object.keys(declaredSources()));
    expect(declared.size).toBeGreaterThan(0);

    for (const row of allRuleRows()) {
      expect(declared.has(row.source), `${row.latin} cites ${row.source}`).toBe(true);
    }
  });

  it("marks every row as not yet reviewed by a native speaker", () => {
    // The mode stays a non-default preview until this changes.
    for (const row of allRuleRows()) {
      expect(row.nativeReviewed, row.latin).toBe(false);
    }
  });

  it("has no duplicate Roman sequences", () => {
    const keys = allRuleRows().map((row) => row.latin);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps the masterplan's starter cases covered by the grammar itself", () => {
    // If a row is ever deleted, the plan's own examples must still convert.
    const covered = new Set(allRuleRows().map((row) => row.latin));
    for (const latin of ["a", "i", "m", "k", "j", "r", "b", "l", "o", "g", "n", "y", "bh", "ng"]) {
      expect(covered.has(latin), latin).toBe(true);
    }
  });
});

describe("the engine as a keystroke consumer", () => {
  it("reports the Roman buffer and clears it on commit", () => {
    const engine = createPhoneticEngine({ grammar, compiled });

    expect(engine.buffer()).toBe("");
    engine.translate({ key: "a" });
    engine.translate({ key: "m" });
    expect(engine.buffer()).toBe("am");

    expect(engine.translate({ key: " " })).toEqual({ type: "commit" });
    expect(engine.buffer()).toBe("");
  });

  it("removes one Roman keystroke per backspace, then hands back to the session", () => {
    const engine = createPhoneticEngine({ grammar, compiled });
    engine.translate({ key: "a" });
    engine.translate({ key: "m" });

    expect(engine.translate({ key: "Backspace" })).toEqual({
      type: "compose",
      text: "আ",
      composing: "a",
    });
    expect(engine.translate({ key: "Backspace" })).toEqual({
      type: "compose",
      text: "",
      composing: "",
    });
    expect(engine.translate({ key: "Backspace" })).toEqual({ type: "backspace" });
  });

  it("refuses to fight an installed Bangla keyboard", () => {
    const engine = createPhoneticEngine({ grammar, compiled });
    expect(engine.translate({ key: "ক" })).toEqual({ type: "ignore", reason: "wrong-script" });
    expect(engine.buffer()).toBe("");
  });

  it("ignores shortcuts, navigation keys and input-method composition", () => {
    const engine = createPhoneticEngine({ grammar, compiled });

    expect(engine.translate({ key: "k", ctrlKey: true })).toEqual({
      type: "ignore",
      reason: "shortcut",
    });
    expect(engine.translate({ key: "Shift" })).toEqual({ type: "ignore", reason: "function-key" });
    expect(engine.translate({ key: "k", isComposing: true })).toEqual({
      type: "ignore",
      reason: "composing",
    });
  });

  it("resets to an empty buffer", () => {
    const engine = createPhoneticEngine({ grammar, compiled });
    engine.translate({ key: "a" });
    engine.reset();
    expect(engine.buffer()).toBe("");
  });

  it("declares that it needs no installed keyboard, unlike system mode", () => {
    expect(createPhoneticEngine().requiresInstalledKeyboard).toBe(false);
    expect(createPhoneticEngine().id).toBe("avro-phonetic");
  });
});
