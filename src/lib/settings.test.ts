import { describe, expect, it } from "vitest";

import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  SETTINGS_KEY,
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
        theme: "dark",
        fontSize: 40,
        inputMode: "avro-phonetic",
        difficulty: "hard",
      }),
    ).toEqual({
      lang: "en",
      theme: "dark",
      fontSize: 40,
      inputMode: "avro-phonetic",
      difficulty: "hard",
    });

    expect(
      parseSettings({
        lang: "fr",
        theme: "neon",
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
});

describe("loadSettings and saveSettings", () => {
  it("round-trips through storage", () => {
    const storage = createMemoryStorage();
    const settings: Settings = { ...defaultSettings, theme: "dark", lang: "en", fontSize: 32 };

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
