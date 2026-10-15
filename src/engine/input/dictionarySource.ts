/**
 * Where the word list comes from at run time.
 *
 * The list is 370 KiB of data that only one input mode uses, so it is fetched
 * rather than bundled: once, when built-in phonetic mode is first used, and the
 * service worker keeps it afterwards. Two
 * things follow from that, and both are why this module exists instead of a
 * plain `const dictionary = ...`:
 *
 * - **A keystroke cannot wait for a fetch.** Conversion is synchronous, so the
 *   engine is handed `liveWordDictionary` once, at creation, and that object
 *   reads whatever has arrived by the time a word is finished. Until the fetch
 *   lands it behaves exactly like `EMPTY_DICTIONARY`, so the first keystrokes
 *   are converted by the rules alone rather than not at all.
 * - **A missing list is not an error.** Built-in mode's rules are the mode; the
 *   list is an assistant. A failed fetch, an offline first visit, or a build
 *   without the asset leaves the engine working and simply loses the corrections.
 */

import {
  createWordDictionary,
  EMPTY_DICTIONARY,
  parseDictionary,
  type WordDictionary,
} from "./phoneticDictionary";

/** Where the build puts the index. Site-root relative: it is not localised. */
export const DICTIONARY_URL = "/dictionary/bn.txt";

let loaded: WordDictionary | null = null;
let pending: Promise<WordDictionary> | null = null;

/**
 * The dictionary handed to the engine at creation time.
 *
 * It is deliberately a view rather than a snapshot: it is created before the
 * fetch starts and must answer for the whole life of the engine, changing its
 * answer when the list arrives.
 */
export const liveWordDictionary: WordDictionary = {
  candidates: (roman) => loaded?.candidates(roman) ?? [],
  get size(): number {
    return loaded?.size ?? 0;
  },
};

/**
 * Fetch and index the word list, at most once per page.
 *
 * Concurrent callers share one fetch, and every failure path resolves to the
 * empty dictionary rather than rejecting: callers are UI effects that have
 * nothing useful to do with an error.
 */
export function loadWordDictionary(
  url: string = DICTIONARY_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<WordDictionary> {
  if (loaded !== null) return Promise.resolve(loaded);
  if (pending !== null) return pending;

  pending = (async (): Promise<WordDictionary> => {
    try {
      const response = await fetchImpl(url);
      if (!response.ok) throw new Error(`dictionary: ${String(response.status)}`);
      loaded = createWordDictionary(parseDictionary(await response.text()));
    } catch {
      loaded = EMPTY_DICTIONARY;
    }
    return loaded;
  })();

  return pending;
}

/** Whether the list has arrived and can correct spellings. */
export function wordDictionaryReady(): boolean {
  return loaded !== null && loaded !== EMPTY_DICTIONARY && loaded.size > 0;
}

/** Forget what was loaded. For tests: nothing in the app reloads the list. */
export function resetWordDictionary(): void {
  loaded = null;
  pending = null;
}
