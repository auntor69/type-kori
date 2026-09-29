import { describe, expect, it } from "vitest";

import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  SETTINGS_KEY,
  allowsBackspace,
  clampFontSize,
  defaultSettings,
  loadSettings,
  parseSettings,
  saveSettings,
  type Settings,
  type StorageAdapter,
} from "./settings";
import { createMemoryStorage } from "./storage";

/** A store that can be seeded with a raw string, for the corrupt-value cases. */
function createFakeStorage(seed: Record<string, string> = {}): StorageAdapter {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

describe("clampFontSize", () => {
  it("keeps the size inside the supported range", () => {
    expect(clampFontSize(28)).toBe(28);
    expect(clampFontSize(5)).toBe(FONT_SIZE_MIN);
    expect(clampFontSize(999)).toBe(FONT_SIZE_MAX);
    expect(clampFontSize(27.6)).toBe(28);
  });

  it("falls back to the default for nonsense", () => {
    expect(clampFontSize(Number.NaN)).toBe(defaultSettings.fontSize);
    expect(clampFontSize(Number.POSITIVE_INFINITY)).toBe(defaultSettings.fontSize);
  });
});

describe("parseSettings", () => {
  it("returns the defaults for anything unusable", () => {
    expect(parseSettings(null)).toEqual(defaultSettings);
    expect(parseSettings("nonsense")).toEqual(defaultSettings);
    expect(parseSettings({})).toEqual(defaultSettings);
  });

  it("keeps valid fields and repairs invalid ones", () => {
    expect(
      parseSettings({
        lang: "en",
        theme: "nord",
        fontSize: 40,
        inputMode: "avro-phonetic",
        difficulty: "hard",
      }),
    ).toEqual({
      ...defaultSettings,
      lang: "en",
      theme: "nord",
      fontSize: 40,
      inputMode: "avro-phonetic",
      difficulty: "hard",
    });

    expect(
      parseSettings({
        lang: "fr",
        theme: "neon-sign",
        fontSize: "big",
        inputMode: "handwriting",
        difficulty: "extreme",
      }),
    ).toEqual(defaultSettings);
  });

  it("clamps a stored font size", () => {
    expect(parseSettings({ fontSize: 400 }).fontSize).toBe(FONT_SIZE_MAX);
  });

  it("keeps the system keyboard as the default input mode", () => {
    expect(defaultSettings.inputMode).toBe("system");
    expect(parseSettings({}).inputMode).toBe("system");
  });

  it("accepts a concrete theme id and repairs a broken one", () => {
    expect(parseSettings({ theme: "nord" }).theme).toBe("nord");
    expect(parseSettings({ theme: "system" }).theme).toBe("system");
    expect(parseSettings({ theme: "not-a-theme" }).theme).toBe("system");
  });

  it("accepts a generated flag theme", () => {
    expect(parseSettings({ theme: "flag-bd" }).theme).toBe("flag-bd");
    expect(parseSettings({ theme: "flag-zz" }).theme).toBe("system");
  });

  it("keeps the deeper options and repairs the rest", () => {
    expect(
      parseSettings({
        quickRestart: "tab",
        confidenceMode: "max",
        indicateTypos: "below",
        hideExtraLetters: true,
        minWpm: 30,
        minAccuracy: 90,
        wordHistory: "always",
        focusMode: true,
        capsLockWarning: false,
        soundVolume: 25,
        funbox: "numbers",
      }),
    ).toEqual({
      ...defaultSettings,
      quickRestart: "tab",
      confidenceMode: "max",
      indicateTypos: "below",
      hideExtraLetters: true,
      minWpm: 30,
      minAccuracy: 90,
      wordHistory: "always",
      focusMode: true,
      capsLockWarning: false,
      soundVolume: 25,
      funbox: "numbers",
    });

    expect(
      parseSettings({
        quickRestart: "space",
        confidenceMode: "total",
        indicateTypos: "upside-down",
        wordHistory: "forever",
        funbox: "chaos",
        soundVolume: 900,
        minWpm: -10,
        minAccuracy: 1000,
      }),
      // The volume and the accuracy cap are clamped; `minWpm: -10` reads as off.
    ).toEqual({ ...defaultSettings, soundVolume: 100, minAccuracy: 100 });
  });

  it("keeps only known theme ids in the favourites list", () => {
    expect(parseSettings({ themeFavourites: ["nord", "nope", "nord", "flag-bd"] }).themeFavourites).toEqual([
      "nord",
      "flag-bd",
    ]);
    expect(parseSettings({ themeFavourites: "nord" }).themeFavourites).toEqual([]);
  });

  it("clamps a stored sound volume", () => {
    expect(parseSettings({ soundVolume: -5 }).soundVolume).toBe(0);
    expect(parseSettings({ soundVolume: 200 }).soundVolume).toBe(100);
  });

  it("keeps the new behavior and appearance fields", () => {
    const parsed = parseSettings({
      stopOnError: "word",
      blindMode: true,
      liveWpm: false,
      caretStyle: "underline",
      showAllLines: false,
    });

    expect(parsed.stopOnError).toBe("word");
    expect(parsed.blindMode).toBe(true);
    expect(parsed.liveWpm).toBe(false);
    expect(parsed.caretStyle).toBe("underline");
    expect(parsed.showAllLines).toBe(false);
  });

  it("repairs malformed behavior and appearance fields to the defaults", () => {
    const parsed = parseSettings({
      stopOnError: "maybe",
      blindMode: "yes",
      liveWpm: 1,
      caretStyle: "blinking",
      showAllLines: "no",
    });

    expect(parsed).toEqual({
      ...defaultSettings,
      lang: defaultSettings.lang,
    });
    expect(parsed.stopOnError).toBe("off");
    expect(parsed.blindMode).toBe(false);
    expect(parsed.liveWpm).toBe(true);
    expect(parsed.caretStyle).toBe("bar");
    expect(parsed.showAllLines).toBe(true);
  });
});

describe("allowsBackspace", () => {
  it("only blocks what the confidence mode is meant to block", () => {
    expect(allowsBackspace("off", 0)).toBe(true);
    expect(allowsBackspace("on", 3)).toBe(true);
    expect(allowsBackspace("on", 0)).toBe(false);
    expect(allowsBackspace("max", 5)).toBe(false);
  });
});

describe("loadSettings and saveSettings", () => {
  it("round-trips through storage", () => {
    const storage = createMemoryStorage();
    const settings: Settings = { ...defaultSettings, theme: "nord", lang: "en", fontSize: 32 };

    expect(saveSettings(settings, storage)).toBe(true);
    expect(loadSettings(storage)).toEqual(settings);
  });

  it("returns the defaults when the key is absent or corrupt", () => {
    expect(loadSettings(createMemoryStorage())).toEqual(defaultSettings);

    const corrupt = createFakeStorage({ [SETTINGS_KEY]: "{not json" });
    expect(loadSettings(corrupt)).toEqual(defaultSettings);
  });

  it("reports a write failure instead of throwing", () => {
    const failing: StorageAdapter = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    };

    expect(saveSettings(defaultSettings, failing)).toBe(false);
  });
});
