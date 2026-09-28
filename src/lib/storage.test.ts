import { describe, expect, it, vi } from "vitest";

import {
  STORAGE_PREFIX,
  availableStorage,
  clearAppStorage,
  createMemoryStorage,
  readJson,
  removeKey,
  writeJson,
  type StorageAdapter,
} from "./storage";

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

const failing: StorageAdapter = {
  getItem: () => null,
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

/** Accepts a number, rejects anything else. */
function parseCount(raw: unknown): number | null {
  return typeof raw === "number" ? raw : null;
}

describe("createMemoryStorage", () => {
  it("keeps values in memory", () => {
    const storage = createMemoryStorage();
    storage.setItem("a", "1");
    expect(storage.getItem("a")).toBe("1");
    storage.removeItem("a");
    expect(storage.getItem("a")).toBeNull();
  });
});

describe("readJson", () => {
  it("parses and validates what is stored", () => {
    expect(readJson("k", parseCount, createFakeStorage({ k: "42" }))).toBe(42);
  });

  it("returns null when the key is absent", () => {
    expect(readJson("missing", parseCount, createMemoryStorage())).toBeNull();
  });

  it("returns null when the value is not JSON, or is rejected", () => {
    expect(readJson("k", parseCount, createFakeStorage({ k: "{not json" }))).toBeNull();
    expect(readJson("k", parseCount, createFakeStorage({ k: '"a string"' }))).toBeNull();
    expect(readJson("k", parseCount, createFakeStorage({ k: "null" }))).toBeNull();
  });

  it("survives a store that throws on read", () => {
    const broken: StorageAdapter = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };

    expect(readJson("k", parseCount, broken)).toBeNull();
  });
});

describe("writeJson", () => {
  it("stores JSON and reports success", () => {
    const storage = createMemoryStorage();
    expect(writeJson("k", { a: 1 }, storage)).toBe(true);
    expect(storage.getItem("k")).toBe('{"a":1}');
  });

  it("reports a failed write instead of throwing", () => {
    expect(writeJson("k", 1, failing)).toBe(false);
  });
});

describe("removeKey", () => {
  it("removes a key", () => {
    const storage = createMemoryStorage();
    storage.setItem("k", "1");
    removeKey("k", storage);
    expect(storage.getItem("k")).toBeNull();
  });

  it("does not throw when the store refuses", () => {
    expect(() => removeKey("k", failing)).not.toThrow();
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
    const bare: StorageAdapter = {
      getItem: () => "{}",
      setItem: () => undefined,
      removeItem: () => undefined,
    };

    expect(() => clearAppStorage(bare)).not.toThrow();
    expect(bare.getItem(`${STORAGE_PREFIX}settings`)).toBe("{}");
  });

  it("clears the memory fallback, so reset works without localStorage", () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}runs`, "[]");

    clearAppStorage(storage);

    expect(storage.getItem(`${STORAGE_PREFIX}runs`)).toBeNull();
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
      const module = await import("./storage");
      const storage = module.availableStorage();
      expect(storage).not.toBe(throwing);
      expect(() => storage.setItem("k", "v")).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
      vi.resetModules();
    }
  });

  it("hands back the real localStorage when it works, and cleans up its probe", () => {
    const original = globalThis.localStorage;
    const real = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    Object.defineProperty(globalThis, "localStorage", { value: real, configurable: true });
    try {
      expect(availableStorage()).toBe(real);
      expect(real.setItem).toHaveBeenCalledWith(`${STORAGE_PREFIX}probe`, "1");
      expect(real.removeItem).toHaveBeenCalledWith(`${STORAGE_PREFIX}probe`);
    } finally {
      Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
    }
  });
});
