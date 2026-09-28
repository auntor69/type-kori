import { describe, expect, it } from "vitest";

import bn from "./bn.json";
import en from "./en.json";
import {
  defaultLang,
  dictionaries,
  langFromPath,
  localizePath,
  mirrorPath,
  stripLang,
  useTranslations,
} from "./index";

/** The danda (U+0964) is shared by Bengali and Devanagari and is correct here. */
const DANDA = String.fromCodePoint(0x0964);
const DEVANAGARI_OUTSIDE_DANDA = /[\u0900-\u0963\u0965-\u097f]/u;
const BENGALI = /[\u0980-\u09ff]/u;

describe("dictionaries", () => {
  it("holds the same keys in every language", () => {
    const reference = Object.keys(dictionaries[defaultLang]).sort();
    for (const [lang, dictionary] of Object.entries(dictionaries)) {
      expect(Object.keys(dictionary).sort(), `language ${lang}`).toEqual(reference);
    }
  });

  it("has no empty or placeholder values", () => {
    for (const [lang, dictionary] of Object.entries(dictionaries)) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim(), `${lang}:${key}`).not.toBe("");
        expect(value, `${lang}:${key}`).not.toMatch(/TODO|FIXME|XXX/);
      }
    }
  });

  it("keeps Bangla strings in Bengali script", () => {
    for (const [key, value] of Object.entries(bn)) {
      expect(value, `bn:${key}`).not.toMatch(DEVANAGARI_OUTSIDE_DANDA);
    }
    expect(BENGALI.test(bn["brand.tagline"])).toBe(true);
    expect(BENGALI.test(bn["practice.startHint"])).toBe(true);
    expect(bn["results.noMistakes"]).toContain(DANDA);
  });

  it("keeps English strings free of Bengali text, except the wordmark", () => {
    for (const [key, value] of Object.entries(en)) {
      if (key === "brand.bangla") continue;
      expect(BENGALI.test(value), `en:${key}`).toBe(false);
    }
  });
});

describe("routing", () => {
  it("treats the root as Bangla and /en as English", () => {
    expect(langFromPath("/")).toBe("bn");
    expect(langFromPath("/privacy")).toBe("bn");
    expect(langFromPath("/en")).toBe("en");
    expect(langFromPath("/en/")).toBe("en");
    expect(langFromPath("/en/privacy")).toBe("en");
  });

  it("mirrors a path into the other language", () => {
    expect(localizePath("/", "bn")).toBe("/");
    expect(localizePath("/", "en")).toBe("/en/");
    expect(localizePath("/privacy", "en")).toBe("/en/privacy");
    expect(localizePath("privacy", "en")).toBe("/en/privacy");
    expect(localizePath("/privacy", "bn")).toBe("/privacy");
  });

  it("strips the English prefix", () => {
    expect(stripLang("/en", "en")).toBe("/");
    expect(stripLang("/en/", "en")).toBe("/");
    expect(stripLang("/en/privacy", "en")).toBe("/privacy");
    expect(stripLang("/privacy", "en")).toBe("/privacy");
    expect(stripLang("/privacy", "bn")).toBe("/privacy");
  });

  it("points the language link at the same page in the other language", () => {
    expect(mirrorPath("/", "en")).toBe("/en/");
    expect(mirrorPath("/privacy", "en")).toBe("/en/privacy");
    expect(mirrorPath("/en/", "bn")).toBe("/");
    expect(mirrorPath("/en/privacy", "bn")).toBe("/privacy");
  });
});

describe("useTranslations", () => {
  it("returns the requested language", () => {
    expect(useTranslations("en")("nav.practice")).toBe("Practice");
    expect(useTranslations("bn")("nav.practice")).toBe("প্র্যাকটিস");
  });

  it("falls back to the key when a translation is missing", () => {
    expect(useTranslations("en")("does.not.exist")).toBe("does.not.exist");
  });
});
