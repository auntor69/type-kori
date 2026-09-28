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
  autoHasanta: boolean;
  digitsAreBengali: boolean;
}

type RuleKind = "vowel" | "consonant" | "mark" | "conjunct" | "digit";

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
  ];
}

export function loadGrammar(raw: unknown = rules): PhoneticGrammar {
  const source = raw as {
    vowels?: VowelRow[];
    consonants?: RuleRow[];
    marks?: RuleRow[];
    conjuncts?: RuleRow[];
    digits?: RuleRow[];
    behavior?: { autoHasanta?: { enabled?: boolean }; digitsAreBengali?: { enabled?: boolean } };
  };

  return {
    vowels: source.vowels ?? [],
    consonants: source.consonants ?? [],
    marks: source.marks ?? [],
    conjuncts: source.conjuncts ?? [],
    digits: source.digits ?? [],
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

  return compiled.sort((a, b) => b.latin.length - a.latin.length);
}

export interface TransliterateOptions {
  grammar?: PhoneticGrammar;
  compiled?: CompiledRule[];
}

/**
 * Convert one Roman word to Bangla. Never throws and never drops input: anything
 * the grammar does not know is passed through unchanged.
 */
export function transliterate(roman: string, options: TransliterateOptions = {}): string {
  const grammar = options.grammar ?? loadGrammar();
  const compiled = options.compiled ?? compileRules(grammar);

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
