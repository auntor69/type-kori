/**
 * Built-in phonetic mode: type Roman letters, get Bangla.
 *
 * The grammar is data (`phonetic-rules.json`) and this file is only the scanner,
 * so rules can be corrected without touching code. Scanning is left to right and
 * longest match first, with one context rule and no backtracking:
 *
 *   - a vowel after a consonant becomes its sign (কার), otherwise its
 *     independent form: `ami` is আ + ম + ি, `gai` is গ + া + ই
 *   - two consonants in a row take an automatic hasanta, which is how `tt`
 *     becomes ত্ত
 *
 * The whole Roman word is re-converted on every keystroke, because the answer
 * changes as more keys arrive (`k` is ক, then `kh` is খ). That is why the engine
 * reports the finished word rather than a delta.
 */

import { classifyCodePoint, HASANTA } from "../unicode";
import rules from "./phonetic-rules.json";
import type { EngineAction, InputEngine, KeyInput } from "./types";

export interface RuleRow {
  latin: string;
  bangla: string;
  source: string;
  nativeReviewed: boolean;
}

export interface VowelRow {
  latin: string;
  independent: string;
  sign: string;
  source: string;
  nativeReviewed: boolean;
}

export interface PhoneticGrammar {
  vowels: VowelRow[];
  consonants: RuleRow[];
  marks: RuleRow[];
  conjuncts: RuleRow[];
  digits: RuleRow[];
  /**
   * Punctuation the target text can contain but a Roman keyboard cannot
   * produce: today only the danda (।), the Bangla full stop. Without a row for
   * it, a run whose target carries one would be impossible to finish in
   * built-in mode. It is the grammar's only unsourced punctuation entry and is
   * listed in `docs/VERIFY.md`.
   */
  punctuation: RuleRow[];
  /**
   * Whole-word exceptions: a Roman spelling that a rule engine gets wrong, with
   * the Bangla a dictionary would pick instead. Consulted only for a complete
   * Roman word, never for a half-typed one.
   */
  dictionary: RuleRow[];
  autoHasanta: boolean;
  digitsAreBengali: boolean;
}

type RuleKind = "vowel" | "consonant" | "mark" | "conjunct" | "digit" | "punctuation";

interface CompiledRule {
  latin: string;
  kind: RuleKind;
  /** The literal output, or both vowel forms. */
  value: string;
  sign?: string;
}

/**
 * The provenance keys the grammar is allowed to cite, with their descriptions.
 * Kept in the data file so a row can never invent a source.
 */
export function declaredSources(raw: unknown = rules): Record<string, string> {
  const meta = (raw as { meta?: { sources?: Record<string, string> } }).meta;
  return meta?.sources ?? {};
}

/**
 * Every rule row in the grammar, for the tests and the cheat sheet. Rows that a
 * native speaker has not signed off are listed in docs/VERIFY.md.
 */
export function allRuleRows(): (RuleRow | VowelRow)[] {
  const grammar = loadGrammar();
  return [
    ...grammar.vowels,
    ...grammar.consonants,
    ...grammar.marks,
    ...grammar.conjuncts,
    ...grammar.digits,
    ...grammar.punctuation,
    ...grammar.dictionary,
  ];
}

export function loadGrammar(raw: unknown = rules): PhoneticGrammar {
  const source = raw as {
    vowels?: VowelRow[];
    consonants?: RuleRow[];
    marks?: RuleRow[];
    conjuncts?: RuleRow[];
    digits?: RuleRow[];
    punctuation?: RuleRow[];
    dictionary?: RuleRow[];
    behavior?: { autoHasanta?: { enabled?: boolean }; digitsAreBengali?: { enabled?: boolean } };
  };

  return {
    vowels: source.vowels ?? [],
    consonants: source.consonants ?? [],
    marks: source.marks ?? [],
    conjuncts: source.conjuncts ?? [],
    digits: source.digits ?? [],
    punctuation: source.punctuation ?? [],
    dictionary: source.dictionary ?? [],
    autoHasanta: source.behavior?.autoHasanta?.enabled ?? true,
    digitsAreBengali: source.behavior?.digitsAreBengali?.enabled ?? true,
  };
}

/**
 * Compile the grammar into a lookup keyed by the Latin sequence. Longer keys win,
 * which is what makes `kh` beat `k` and `kkh` beat both.
 */
export function compileRules(grammar: PhoneticGrammar = loadGrammar()): CompiledRule[] {
  const compiled: CompiledRule[] = [];

  for (const row of grammar.vowels) {
    compiled.push({ latin: row.latin, kind: "vowel", value: row.independent, sign: row.sign });
  }
  for (const row of grammar.consonants) {
    compiled.push({ latin: row.latin, kind: "consonant", value: row.bangla });
  }
  for (const row of grammar.marks) {
    compiled.push({ latin: row.latin, kind: "mark", value: row.bangla });
  }
  for (const row of grammar.conjuncts) {
    compiled.push({ latin: row.latin, kind: "conjunct", value: row.bangla });
  }
  if (grammar.digitsAreBengali) {
    for (const row of grammar.digits) {
      compiled.push({ latin: row.latin, kind: "digit", value: row.bangla });
    }
  }
  // Punctuation is never gated on the numerals setting: a danda is not a digit,
  // and a target containing one must stay typeable in every configuration.
  for (const row of grammar.punctuation) {
    compiled.push({ latin: row.latin, kind: "punctuation", value: row.bangla });
  }

  return compiled.sort((a, b) => b.latin.length - a.latin.length);
}

export interface TransliterateOptions {
  grammar?: PhoneticGrammar;
  compiled?: CompiledRule[];
}

/**
 * The dictionary entry for a complete Roman word, or null. Matching is
 * case-insensitive because a learner's shift state should not change which word
 * the dictionary recognises.
 */
export function dictionaryWord(
  roman: string,
  grammar: PhoneticGrammar = loadGrammar(),
): string | null {
  const key = roman.toLowerCase();
  for (const row of grammar.dictionary) {
    if (row.latin.toLowerCase() === key) return row.bangla;
  }
  return null;
}

/** True when `roman` is the beginning of a dictionary spelling. */
export function isDictionaryPrefix(
  roman: string,
  grammar: PhoneticGrammar = loadGrammar(),
): boolean {
  const key = roman.toLowerCase();
  return grammar.dictionary.some((row) => row.latin.toLowerCase().startsWith(key));
}

/**
 * Convert one Roman word to Bangla. Never throws and never drops input: anything
 * the grammar does not know is passed through unchanged.
 */
/**
 * Split a typed buffer into the word and the punctuation that trails it.
 *
 * Punctuation is typed into the same buffer as the word — the engine has no
 * other place to put it — but only the word has a dictionary entry, so
 * `kotha.` must be resolved as `kotha` plus a danda or the sentence-final word
 * of every text would fall back to the rules and come out wrong. A trailing
 * character that is not a letter or a digit ends the word; that covers both the
 * danda's Roman key and punctuation the grammar passes through unchanged.
 */
export function splitTrailingPunctuation(buffer: string): [string, string] {
  let index = buffer.length;
  while (index > 0 && !/[A-Za-z0-9]/.test(buffer[index - 1] as string)) index -= 1;
  return [buffer.slice(0, index), buffer.slice(index)];
}

export function transliterate(roman: string, options: TransliterateOptions = {}): string {
  const grammar = options.grammar ?? loadGrammar();
  const compiled = options.compiled ?? compileRules(grammar);

  // A complete word the dictionary knows wins over the rules: this is how a
  // word-final inherent vowel (kemon → কেমন) comes out right, which no rule
  // table can decide. Only a whole word is looked up, so a half-typed one still
  // shows the provisional rule output.
  const [word, trailing] = splitTrailingPunctuation(roman);
  const known = dictionaryWord(word, grammar);
  if (known !== null) return known + rulesOnly(trailing, grammar, compiled);

  return rulesOnly(roman, grammar, compiled);
}

/**
 * The rule table applied to one buffer, with no dictionary step: the part of the
 * conversion that has nothing to consult but the grammar.
 */
function rulesOnly(
  roman: string,
  grammar: PhoneticGrammar,
  compiled: CompiledRule[],
): string {
  let output = "";
  let previous: "none" | "consonant" | "other" = "none";
  let index = 0;

  while (index < roman.length) {
    const rule = compiled.find((candidate) => roman.startsWith(candidate.latin, index));

    if (rule === undefined) {
      output += roman[index];
      previous = "other";
      index += 1;
      continue;
    }

    if (rule.kind === "consonant" || rule.kind === "conjunct") {
      if (previous === "consonant" && grammar.autoHasanta) output += HASANTA;
      output += rule.value;
      previous = "consonant";
    } else if (rule.kind === "vowel") {
      output += previous === "consonant" ? (rule.sign ?? rule.value) : rule.value;
      previous = "other";
    } else {
      output += rule.value;
      previous = "other";
    }

    index += rule.latin.length;
  }

  return output;
}

export interface PhoneticEngine extends InputEngine {
  id: "avro-phonetic";
  /** The Roman keystrokes buffered for the word being typed. */
  buffer(): string;
}

export function isBanglaCharacter(text: string): boolean {
  if (Array.from(text).length !== 1) return false;
  const kind = classifyCodePoint((text.codePointAt(0) as number) ?? 0);
  return (
    kind === "independent-vowel" ||
    kind === "consonant" ||
    kind === "vowel-sign" ||
    kind === "syllable-mark"
  );
}

export function createPhoneticEngine(
  options: TransliterateOptions = {},
): PhoneticEngine {
  const grammar = options.grammar ?? loadGrammar();
  const compiled = options.compiled ?? compileRules(grammar);
  let buffer = "";

  const emit = (): EngineAction => ({
    type: "compose",
    text: transliterate(buffer, { grammar, compiled }),
    composing: buffer,
  });

  return {
    id: "avro-phonetic",
    requiresInstalledKeyboard: false,
    buffer: () => buffer,

    translate(input: KeyInput): EngineAction {
      if (input.isComposing === true) return { type: "ignore", reason: "composing" };
      if (input.ctrlKey || input.metaKey || input.altKey) {
        return { type: "ignore", reason: "shortcut" };
      }

      if (input.key === "Backspace") {
        // Backspace removes the last Roman keystroke and re-renders the word
        // (Section 7.3.7). Once the buffer is empty, the session takes over and
        // reopens the previous committed word.
        if (buffer.length === 0) return { type: "backspace" };
        buffer = buffer.slice(0, -1);
        return emit();
      }

      if (input.key === "Enter" || input.key === " ") {
        // The session commits the word it already has; the buffer starts the
        // next word empty.
        buffer = "";
        return { type: "commit" };
      }

      if (isBanglaCharacter(input.key)) {
        // An installed Bangla keyboard is already converting; the built-in
        // engine must not fight it (Sections 5.2 and 7.3.9).
        return { type: "ignore", reason: "wrong-script" };
      }

      if (Array.from(input.key).length !== 1) {
        return { type: "ignore", reason: "function-key" };
      }

      buffer += input.key;
      return emit();
    },

    reset(): void {
      buffer = "";
    },
  };
}
