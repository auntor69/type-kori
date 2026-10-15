/**
 * The runtime side of the word list: where it comes from and what happens when
 * it does not arrive.
 *
 * The engine's contract is that the list is *optional* — built-in mode works
 * while the fetch is in flight, after a failed fetch, and forever if the asset is
 * missing — so every one of those paths is a case here rather than an assertion
 * about the happy path.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  DICTIONARY_URL,
  liveWordDictionary,
  loadWordDictionary,
  resetWordDictionary,
  wordDictionaryReady,
} from "./dictionarySource";
import { EMPTY_DICTIONARY } from "./phoneticDictionary";

/** A stand-in for the fetch the browser would do. */
const respond = (text: string, ok = true): Response =>
  ({ ok, status: ok ? 200 : 404, text: async () => text }) as unknown as Response;

describe("the word list loader", () => {
  beforeEach(() => resetWordDictionary());

  it("corrects nothing before the list has arrived", () => {
    expect(liveWordDictionary.candidates("kemon")).toEqual([]);
    expect(liveWordDictionary.size).toBe(0);
    expect(wordDictionaryReady()).toBe(false);
  });

  it("fetches the asset the build writes, once the mode needs it", async () => {
    let asked = "";
    await loadWordDictionary(DICTIONARY_URL, async (url) => {
      asked = String(url);
      return respond("Da^Talo ডাঁটালো ডাঁটাল\n");
    });

    expect(asked).toBe("/dictionary/bn.txt");
  });

  it("fills the engine's view as soon as the list lands", async () => {
    const loaded = await loadWordDictionary(DICTIONARY_URL, async () =>
      respond("Da^Talo ডাঁটালো ডাঁটাল\n"),
    );

    expect(loaded.size).toBe(1);
    expect(loaded.candidates("Da^Talo")).toEqual(["ডাঁটালো", "ডাঁটাল"]);
    // The engine holds the view, not a snapshot of it: it was created before the
    // fetch started and must answer with the list that arrived afterwards.
    expect(liveWordDictionary.candidates("Da^Talo")).toEqual(["ডাঁটালো", "ডাঁটাল"]);
    expect(liveWordDictionary.size).toBe(1);
    expect(wordDictionaryReady()).toBe(true);
  });

  it("fetches once however many callers ask", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return respond("kemon কেমন\n");
    };

    await Promise.all([
      loadWordDictionary(DICTIONARY_URL, fetchImpl),
      loadWordDictionary(DICTIONARY_URL, fetchImpl),
    ]);
    await loadWordDictionary(DICTIONARY_URL, fetchImpl);

    expect(calls).toBe(1);
  });

  it("treats a failed response as no word list at all", async () => {
    const loaded = await loadWordDictionary(DICTIONARY_URL, async () => respond("", false));

    expect(loaded).toBe(EMPTY_DICTIONARY);
    expect(liveWordDictionary.candidates("Da^Talo")).toEqual([]);
    expect(wordDictionaryReady()).toBe(false);
  });

  it("survives a fetch that throws, and a malformed asset", async () => {
    const offline = await loadWordDictionary(DICTIONARY_URL, async () => {
      throw new Error("offline");
    });
    expect(offline.size).toBe(0);

    resetWordDictionary();
    const malformed = await loadWordDictionary(DICTIONARY_URL, async () =>
      respond("not-a-word-list\n\nonly-one-field\n"),
    );
    expect(malformed.size).toBe(0);
    expect(malformed.candidates("not-a-word-list")).toEqual([]);
  });
});
