/**
 * The cheat sheet is generated from the grammar, so these tests are really about
 * the promise that makes it worth reading: what `/keyboard` prints is what the
 * engine does. Every row is pushed back through the engine, the totals are
 * counted from the data rather than typed by hand, and the pages are checked for
 * actually using the generated groups instead of a hand-copied table.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { allRuleRows, loadGrammar, transliterate } from "../engine/input/phonetic";
import { isBanglaOnly, splitWords } from "../engine/unicode";
import {
  guideRowMatchesEngine,
  phoneticGuideGroups,
  phoneticGuideTotals,
  type GuideGroupId,
} from "./phoneticGuide";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

const grammar = loadGrammar();
const groups = phoneticGuideGroups(grammar);
const rows = groups.flatMap((group) => group.rows);

describe("the sheet covers the grammar", () => {
  it("shows every rule row, and shows it once", () => {
    // A row that the grammar has but the sheet does not would be a rule nobody
    // can discover; a duplicated row would make the count meaningless.
    expect(rows.length).toBe(allRuleRows().length);
  });

  it("looks up each rule row in exactly one group", () => {
    // Counted per group: `f` and `ph` both produce ফ but they are two rows, so
    // the check is on coverage of the grammar, not on distinct outputs.
    const seen = new Set<string>();
    for (const group of groups) {
      for (const row of group.rows) {
        const key = `${group.id}:${row.latin}:${row.bangla}`;
        expect(seen.has(key), key).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(rows.length);
  });

  it("keeps the grammar's order, which is the order to learn them in", () => {
    const ids = groups.map((group) => group.id);
    const expected: GuideGroupId[] = [
      "vowels",
      "consonants",
      "marks",
      "conjuncts",
      "digits",
      "punctuation",
      "dictionary",
    ];
    expect(ids).toEqual(expected.filter((id) => ids.includes(id)));
    // Vowels run from অ to ঔ, not alphabetically.
    expect(groups[0].rows[0].latin).toBe("a");
    expect(groups[0].rows.at(-1)?.bangla).toBe("ঔ");
  });

  it("drops a group the grammar leaves empty", () => {
    const withoutDictionary = phoneticGuideGroups({ ...grammar, dictionary: [] });
    expect(withoutDictionary.map((group) => group.id)).not.toContain("dictionary");
  });
});

describe("every row is usable Bangla", () => {
  it("renders a non-empty Bangla string with no Latin left in it", () => {
    for (const row of rows) {
      expect(row.bangla.length, row.latin).toBeGreaterThan(0);
      expect(isBanglaOnly(row.bangla), `${row.latin} → ${row.bangla}`).toBe(true);
      expect(row.sign === undefined || isBanglaOnly(row.sign), row.latin).toBe(true);
    }
  });

  it("lists the ten digits in order", () => {
    const digits = groups.find((group) => group.id === "digits");
    expect(digits?.rows.map((row) => row.latin)).toEqual("0123456789".split(""));
    expect(digits?.rows[0].bangla).toBe("০");
  });

  it("offers a sign form for every vowel, and for nothing else", () => {
    // Each vowel has both its independent form (after a vowel or a space) and
    // its sign (after a consonant), which is the rule the sheet has to teach.
    for (const group of groups) {
      for (const row of group.rows) {
        if (group.id === "vowels") expect(row.sign, row.latin).toBeTruthy();
        else expect(row.sign, row.latin).toBeUndefined();
      }
    }
  });

  it("keeps the dictionary to whole words", () => {
    const dictionary = groups.find((group) => group.id === "dictionary");
    for (const row of dictionary?.rows ?? []) {
      // A dictionary entry is a whole Roman word, which is what the engine
      // matches: an entry with a space in it could never be reached.
      expect(splitWords(row.latin), row.latin).toHaveLength(1);
      expect(row.latin, row.latin).not.toMatch(/\s/u);
    }
  });
});

describe("the sheet agrees with the engine", () => {
  it("shows what the engine actually produces for every row", () => {
    for (const row of rows) {
      expect(guideRowMatchesEngine(row, (roman) => transliterate(roman)), row.latin).toBe(true);
    }
  });

  it("keeps the dictionary ahead of the rules, so its exceptions still win", () => {
    // `kemon` is the case the dictionary exists for: the rules alone give
    // কেমোন, and the sheet must show the dictionary's কেমন.
    const row = rows.find((candidate) => candidate.latin === "kemon");
    expect(row?.bangla).toBe("কেমন");
    expect(transliterate("kemon")).toBe("কেমন");
  });
});

describe("the review status is counted, never written by hand", () => {
  it("counts the rows a native speaker has signed off", () => {
    const totals = phoneticGuideTotals(groups);
    const reviewed = rows.filter((row) => row.reviewed).length;
    expect(totals).toEqual({ rows: rows.length, reviewed, pending: rows.length - reviewed });
    expect(totals.reviewed + totals.pending).toBe(totals.rows);
  });

  it("matches the grammar's own nativeReviewed flags", () => {
    const fromGrammar = [...grammar.vowels, ...grammar.consonants, ...grammar.marks]
      .concat(grammar.conjuncts, grammar.digits, grammar.dictionary)
      .filter((row) => row.nativeReviewed).length;
    expect(phoneticGuideTotals(groups).reviewed).toBe(fromGrammar);
  });
});

describe("the keyboard page uses the generated sheet", () => {
  const pages = ["src/pages/keyboard.astro", "src/pages/en/keyboard.astro"];

  it("exists in both editions and renders one table per group", () => {
    for (const page of pages) {
      const source = read(page);
      expect(source, page).toContain("phoneticGuideGroups");
      expect(source, page).toContain("phoneticGuideTotals");
      // No rule may be copied into the page by hand: the mapping comes from the
      // grammar, so a corrected row cannot leave stale prose behind.
      expect(source, page).not.toContain("kkh");
      expect(source, page).toContain("guideRowMatchesEngine");
    }
  });

  it("declares a breadcrumb trail and nothing it cannot back up", () => {
    for (const page of pages) {
      const source = read(page);
      expect(source, page).toContain('"@type": "BreadcrumbList"');
      expect(source, page).not.toContain("aggregateRating");
    }
  });

  it("is reachable from the shared layout, so it is not an orphan", () => {
    const layout = read("src/layouts/BaseLayout.astro");
    expect(layout).toContain('localizePath("/keyboard", lang)');
  });

  it("links to the sheet from the practice toolbar", () => {
    expect(read("src/components/Practice.tsx")).toContain("/keyboard");
  });

  it("speaks both languages", () => {
    const keys = [
      "nav.keyboard",
      "keyboard.title",
      "keyboard.description",
      "keyboard.how.title",
      "keyboard.how.context",
      "keyboard.how.hasanta",
      "keyboard.how.backspace",
      "keyboard.how.dictionary",
      "keyboard.group.vowels",
      "keyboard.group.consonants",
      "keyboard.group.marks",
      "keyboard.group.conjuncts",
      "keyboard.group.digits",
      "keyboard.group.dictionary",
      "keyboard.column.latin",
      "keyboard.column.sign",
      "keyboard.status.reviewed",
      "keyboard.status.pending",
      "keyboard.note",
      "keyboard.practice",
      "keyboard.related",
      "keyboard.meta.title",
      "keyboard.meta.description",
    ];
    for (const key of keys) {
      for (const file of ["src/i18n/bn.json", "src/i18n/en.json"]) {
        expect(read(file), `${file} is missing ${key}`).toContain(`"${key}"`);
      }
    }
  });
});
