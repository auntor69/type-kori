/*
 * Build — and audit — the word list the phonetic engine consults.
 *
 * The engine's grammar can spell Bangla but cannot tell a word from a near-miss,
 * and it has no way to see that one Roman spelling may be two different words.
 * This script turns a plain word list into the index the engine reads, and it
 * reports what it rejected and why, because the rejections are the useful part:
 * every word the grammar cannot spell is a place built-in mode would fail a
 * learner, and the report groups them so the grammar can be fixed in the order
 * that matters.
 *
 *   bun scripts/build-dictionary.ts [<word-list>] [--format plain|hunspell]
 *                                    [--out <file>] [--limit N]
 *   bun scripts/build-dictionary.ts --audit            (report only)
 *   bun scripts/build-dictionary.ts --check            (exit 1 if out of date)
 *
 * The index is written to `public/dictionary/bn.txt` and committed, because the
 * app fetches it at run time: the dev server has to serve it, and hosting must
 * not need a build step of its own. `bun run build` regenerates it first, so it
 * cannot drift, and `--check` is what CI runs when it must not silently rewrite.
 * The source word list is committed under `content/dictionary/`, with its
 * licence and its provenance in `NOTICE.md` beside it.
 *
 * The pure half lives in `src/engine/input/phoneticDictionary.ts`; this file is
 * the file handling and the report.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { targetWords } from "../src/content/targetWords.ts";
import {
  buildDictionary,
  compileInverse,
  invertWord,
  isSpellableAlphabet,
  serializeDictionary,
  type BuildResult,
  type DictionaryEntry,
} from "../src/engine/input/phoneticDictionary.ts";
import { loadGrammar, transliterate } from "../src/engine/input/phonetic.ts";
import { normalizeText, splitClusters } from "../src/engine/unicode.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

export type SourceFormat = "plain" | "hunspell";

/** Default source, output and the two ways to run without writing. */
const DEFAULT_SOURCE = "content/dictionary/bn_BD.dic";
const DEFAULT_OUT = "public/dictionary/bn.txt";

/**
 * A word is a run of letters; a lone sign or hasanta is not a word to type. The
 * class is the Bengali letters: independent vowels, consonants, and the three
 * nukta letters, which Hunspell lists alongside them.
 */
const HAS_A_LETTER = /[\u0985-\u0994\u0995-\u09B9\u09DC-\u09DF]/;

/**
 * Which format a source file is in: the extension decides unless overridden.
 * `.dic` names its own format, and a plain list is one word per line.
 */
export function sourceFormat(path: string, flag: string | null): SourceFormat {
  if (flag === "plain" || flag === "hunspell") return flag;
  return path.toLowerCase().endsWith(".dic") ? "hunspell" : "plain";
}

/**
 * Read a source list into words.
 *
 * Plain is one word per line. Hunspell is the `.dic` a spell checker ships: its
 * first line is a count, and a word may carry affix flags after a `/`
 * (`কামরাঙ্গীরচর/p`). The flags are dropped rather than expanded — expanding them
 * means implementing the `.aff` rules, and a word the list is missing simply
 * falls back to the grammar, which is the behaviour that shipped before this
 * list existed. Dropping the flags only ever loses inflected forms, never a word
 * the source itself lists.
 */
export function readWords(path: string, format: SourceFormat): string[] {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const body = format === "hunspell" ? lines.slice(1) : lines;

  return body
    .map((line) => {
      const word = format === "hunspell" ? line.replace(/\/.*$/, "") : line;
      return normalizeText(word.trim());
    })
    .filter((word) => word !== "" && HAS_A_LETTER.test(word));
}

export interface Audit {
  build: BuildResult;
  /** The grammar's failure modes, commonest first. */
  failures: { cluster: string; roman: string; word: string; count: number }[];
  /** Spellings that are two or more words — where the list earns its keep. */
  collisions: { roman: string; words: string[] }[];
  /**
   * Entries the list can act on: the rules' own output for that spelling is not
   * a word, so the list's spelling is a correction rather than a preference.
   */
  rescued: DictionaryEntry[];
  /**
   * Entries the list must leave alone: the rules already produce a real word
   * from that spelling, and choosing the other one would be a guess with no
   * frequency data behind it.
   */
  resolved: DictionaryEntry[];
  /**
   * App targets the source list does not contain. They are kept anyway (a target
   * has to be typeable), and this is the count of words the list would be worth
   * reporting upstream.
   */
  missingTargets: string[];
}

/**
 * The first cluster where the engine's own output diverges from the word.
 *
 * Naming the cluster rather than the word is what makes the report actionable:
 * a few clusters account for most of the failures, and the cluster is the thing
 * a grammar row would have to change.
 */
function firstDivergence(word: string, ruled: string): string {
  const wanted = splitClusters(word);
  const produced = splitClusters(ruled);
  for (let index = 0; index < Math.max(wanted.length, produced.length); index += 1) {
    const want = wanted[index] ?? "(end)";
    const got = produced[index] ?? "(end)";
    if (want !== got) return `${want}≠${got}`;
  }
  return "(none)";
}

/** Read a source list and build the index, gathering the report as it goes. */
export function audit(source: string, limit = Infinity, format: SourceFormat = "plain"): Audit {
  const grammar = loadGrammar();
  const table = compileInverse(grammar);
  const ruled = (roman: string) => transliterate(roman, { grammar: { ...grammar, dictionary: [] } });

  const raw = readWords(source, format).slice(0, limit);

  // The app's own targets count as words whether or not the source list has ever
  // heard of them: a correction that shadowed one would make a lesson target
  // impossible to type, which is worse than any spelling it could fix.
  const targets = targetWords();
  const build = buildDictionary([...raw, ...targets], grammar);

  const failureCounts = new Map<string, { cluster: string; roman: string; word: string; count: number }>();
  for (const word of raw) {
    if (!isSpellableAlphabet(word)) continue;
    const roman = invertWord(word, table);
    if (roman === null) continue;
    if (ruled(roman) === word) continue;
    const cluster = firstDivergence(word, ruled(roman));
    const found = failureCounts.get(cluster);
    if (found === undefined) {
      failureCounts.set(cluster, { cluster, roman, word, count: 1 });
    } else {
      found.count += 1;
    }
  }

  // `known` is the whole built list, not only the entry being judged: a spelling
  // may produce a word that lives under a different spelling, and that still
  // means the rules produced something real and the list has no business
  // overriding it.
  const known = new Set(build.words);
  const missingTargets = [...targets].filter((word) => !known.has(word) && isTypeable(word, table, grammar));
  const collisions = build.entries
    .filter((entry) => entry.words.length > 1)
    .sort((a, b) => b.words.length - a.words.length);

  const rescued: DictionaryEntry[] = [];
  const resolved: DictionaryEntry[] = [];
  for (const entry of build.entries) {
    if (known.has(ruled(entry.roman))) resolved.push(entry);
    else rescued.push(entry);
  }

  return {
    build,
    failures: [...failureCounts.values()].sort((a, b) => b.count - a.count),
    collisions,
    rescued,
    resolved,
    missingTargets,
  };
}

function sizes(entries: DictionaryEntry[]): string {
  const serialized = serializeDictionary(entries);
  const bytes = Buffer.byteLength(serialized, "utf8");
  const gzipped = gzipSync(serialized).length;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB raw, ${(gzipped / 1024 / 1024).toFixed(2)} MiB gzip`;
}

function report(result: Audit, source: string, format: SourceFormat): void {
  const { build } = result;

  console.log(`source            ${source} (${format})`);
  console.log(`words read        ${build.stats.input}   (the source list plus the app's own targets)`);
  console.log(`  kept            ${build.stats.kept}`);
  console.log(`  not spellable   ${build.stats.rejectedAlphabet}`);
  console.log(`  not typeable    ${build.stats.rejectedUntypeable}`);
  console.log(`spellings         ${build.entries.length}`);
  console.log(`ambiguous         ${result.collisions.length}`);
  console.log(`whole index       ${sizes(build.entries)}`);

  if (result.missingTargets.length > 0) {
    console.log(`\napp targets the source list does not have: ${result.missingTargets.length}`);
    for (const word of result.missingTargets.slice(0, 6)) console.log(`  ${word}`);
  }

  console.log(`\nof those spellings:`);
  console.log(`  a correction    ${result.rescued.length}   ${sizes(result.rescued)}`);
  console.log(`  a preference    ${result.resolved.length}   (rules already spell a real word; not shipped)`);

  if (result.collisions.length > 0) {
    console.log("\nTwo words, one spelling — what the list can see and a rule table cannot:");
    for (const entry of result.collisions.slice(0, 6)) {
      console.log(`  ${entry.roman}  ${entry.words.join("  ")}`);
    }
  }

  if (result.rescued.length > 0) {
    console.log("\nSpellings the list corrects (rules produce a non-word):");
    for (const entry of result.rescued.slice(0, 6)) {
      const ruled = transliterate(entry.roman, { grammar: { ...loadGrammar(), dictionary: [] } });
      console.log(`  ${entry.roman}  rules ${ruled} → list ${entry.words.join("  ")}`);
    }
  }

  if (result.failures.length > 0) {
    console.log("\nWords the grammar cannot spell, by the cluster that diverges:");
    for (const failure of result.failures.slice(0, 12)) {
      console.log(`  ${String(failure.count).padStart(6)}  ${failure.cluster}  ${failure.word} (${failure.roman})`);
    }
  }
}

function main(argv: string[]): number {
  const args = argv.filter((arg) => !arg.startsWith("--"));
  const flag = (name: string): string | null => {
    const at = argv.indexOf(name);
    return at === -1 ? null : (argv[at + 1] ?? null);
  };

  const source = resolve(ROOT, args[0] ?? DEFAULT_SOURCE);
  const format = sourceFormat(source, flag("--format"));
  const limited = flag("--limit");
  const outArg = flag("--out");
  const out = argv.includes("--audit") ? null : resolve(ROOT, outArg ?? DEFAULT_OUT);

  const result = audit(source, limited === null ? Infinity : Number(limited), format);
  report(result, source, format);

  const serialized = serializeDictionary(result.rescued);

  // A committed index can go stale; this is how CI says so instead of the build
  // quietly rewriting the file a reviewer never saw.
  if (argv.includes("--check")) {
    const path = out ?? resolve(ROOT, DEFAULT_OUT);
    let actual: string | null = null;
    try {
      actual = readFileSync(path, "utf8");
    } catch {
      actual = null;
    }
    if (actual === null) {
      console.error(`\n${path} is missing: run bun run build:dictionary`);
      return 1;
    }
    if (actual !== serialized) {
      console.error(`\n${path} is out of date: run bun run build:dictionary`);
      return 1;
    }
    console.log(`\n${path} is up to date (${result.rescued.length} spellings)`);
    return 0;
  }

  if (out !== null) {
    mkdirSync(dirname(out), { recursive: true });
    // Only the corrections ship: an entry the rules already resolve cannot change
    // anything, and shipping it would be several megabytes of dead weight.
    writeFileSync(out, serialized, "utf8");
    const kib = Buffer.byteLength(serialized, "utf8") / 1024;
    console.log(`\nwrote ${out} (${result.rescued.length} spellings, ${kib.toFixed(0)} KiB)`);
  }

  return 0;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
