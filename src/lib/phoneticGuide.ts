/**
 * The phonetic cheat sheet, built from the grammar itself.
 *
 * The practice tool and the documentation must never disagree about what `kkh`
 * does, and the way to guarantee that is to have exactly one source: the tables
 * on `/keyboard` are generated from `phonetic-rules.json` at build time, so a
 * corrected rule shows up in the guide without anyone remembering to edit prose.
 * This module is the shaping step — grammar in, ordered groups of rows out — and
 * it holds no knowledge of the mapping beyond what the data says.
 *
 * Rows keep the grammar's own order, which is pedagogical: the vowels run from
 * অ to ঔ, and the consonants follow the traditional places of articulation
 * (velar, palatal, retroflex, dental, labial, then the sonorants) rather than the
 * alphabet or a keyboard.
 */

import { loadGrammar, type PhoneticGrammar, type RuleRow, type VowelRow } from "../engine/input/phonetic";

export type GuideGroupId =
  | "vowels"
  | "consonants"
  | "marks"
  | "conjuncts"
  | "digits"
  | "punctuation"
  | "dictionary";

export interface GuideRow {
  /** The Roman keystrokes to press. */
  latin: string;
  /** The Bangla the engine produces. */
  bangla: string;
  /**
   * A vowel's sign form (the কার), which the engine uses after a consonant.
   * Absent for every other kind of row, and for the vowels that have none.
   */
  sign?: string;
  /** Whether a native speaker has signed this row off (docs/VERIFY.md). */
  reviewed: boolean;
}

export interface GuideGroup {
  id: GuideGroupId;
  rows: GuideRow[];
}

const isVowel = (row: RuleRow | VowelRow): row is VowelRow => "independent" in row;

function toGuideRow(row: RuleRow | VowelRow): GuideRow {
  if (isVowel(row)) {
    return {
      latin: row.latin,
      bangla: row.independent,
      sign: row.sign,
      reviewed: row.nativeReviewed,
    };
  }
  return { latin: row.latin, bangla: row.bangla, reviewed: row.nativeReviewed };
}

/**
 * The cheat sheet as groups, in the order the page shows them. Empty groups are
 * dropped, so a grammar without a dictionary section renders no empty table.
 */
export function phoneticGuideGroups(grammar: PhoneticGrammar = loadGrammar()): GuideGroup[] {
  const groups: GuideGroup[] = [
    { id: "vowels", rows: grammar.vowels.map(toGuideRow) },
    { id: "consonants", rows: grammar.consonants.map(toGuideRow) },
    { id: "marks", rows: grammar.marks.map(toGuideRow) },
    { id: "conjuncts", rows: grammar.conjuncts.map(toGuideRow) },
    { id: "digits", rows: grammar.digits.map(toGuideRow) },
    { id: "punctuation", rows: grammar.punctuation.map(toGuideRow) },
    { id: "dictionary", rows: grammar.dictionary.map(toGuideRow) },
  ];

  return groups.filter((group) => group.rows.length > 0);
}

export interface GuideTotals {
  rows: number;
  reviewed: number;
  pending: number;
}

/** How much of the sheet a native speaker has actually signed off. */
export function phoneticGuideTotals(groups: GuideGroup[] = phoneticGuideGroups()): GuideTotals {
  const rows = groups.flatMap((group) => group.rows);
  const reviewed = rows.filter((row) => row.reviewed).length;

  return { rows: rows.length, reviewed, pending: rows.length - reviewed };
}

/**
 * Does the engine turn these keystrokes into exactly this Bangla? Used by the
 * tests to hold every row of the sheet to the engine's behaviour, and by the
 * page to mark a row that is out of step instead of printing a lie.
 */
export function guideRowMatchesEngine(
  row: GuideRow,
  transliterate: (roman: string) => string,
): boolean {
  return transliterate(row.latin) === row.bangla;
}
