import { describe, expect, it, vi } from "vitest";

import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  SETTINGS_KEY,
  STORAGE_PREFIX,
  clampFontSize,
  clearAppStorage,
  createMemoryStorage,
  defaultSettings,
  loadSettings,
  parseSettings,
  saveSettings,
  type Settings,
  type StorageAdapter,
} from "./settings";

/** A localStorage-shaped store: length and key() included for clearAppStorage. */
function createFakeStorage(seed: Record<string, string> = {}): StorageAdapter & {
  length: number;
  key: (index: number) => string | null;
} {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
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

describe("createMemoryStorage", () => {
  it("keeps values in memory", () => {
    const storage = createMemoryStorage();
    storage.setItem("a", "1");
    expect(storage.getItem("a")).toBe("1");
    storage.removeItem("a");
    expect(storage.getItem("a")).toBeNull();
  });
});

describe("clearAppStorage", () => {
  it("removes only keys this app owns", () => {
    const storage = createFakeStorage({
      [`${STORAGE_PREFIX}settings`]: "{}",
      [`${STORAGE_PREFIX}runs`]: "[]",
      "someone-elses-key": "keep me",
    });

    clearAppStorage(storage);

    expect(storage.getItem("someone-elses-key")).toBe("keep me");
    expect(storage.getItem(`${STORAGE_PREFIX}settings`)).toBeNull();
    expect(storage.getItem(`${STORAGE_PREFIX}runs`)).toBeNull();
  });

  it("does nothing for a store that cannot enumerate its keys", () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}settings`, "{}");

    expect(() => clearAppStorage(storage)).not.toThrow();
  });
});

describe("the global storage probe", () => {
  it("falls back to memory when localStorage throws", async () => {
    const original = globalThis.localStorage;
    const throwing = {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error("SecurityError");
      }),
      removeItem: vi.fn(),
    };

    Object.defineProperty(globalThis, "localStorage", { value: throwing, configurable: true });
    vi.resetModules();

    try {
      const module = await import("./settings");
      const storage = module.availableStorage();
      expect(storage).not.toBe(throwing);
      expect(() => storage.setItem("k", "v")).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
      vi.resetModules();
    }
  });
});
