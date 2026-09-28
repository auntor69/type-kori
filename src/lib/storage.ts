/**
 * Storage primitives. Everything stays in the browser: there is no account, no
 * backend and no cookie. Keys are versioned (`tk:v1:…`) so a future schema can
 * migrate instead of guessing (Section 9 of docs/MASTERPLAN.md).
 *
 * Storage can be unavailable (private mode, a policy, a disabled API) and it can
 * be full, so every write is probed and every read is defensive. Nothing here
 * throws over storage: the app degrades to memory instead.
 */

export const STORAGE_PREFIX = "tk:v1:";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Real `localStorage` exposes these; so does the memory fallback. */
  readonly length?: number;
  key?(index: number): string | null;
}

/**
 * Used when the browser refuses storage (private mode, quota, disabled). It also
 * enumerates its keys, so "reset everything" still works without `localStorage`.
 */
export function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

const memoryFallback = createMemoryStorage();

/**
 * `localStorage` when it actually works, an in-memory store otherwise. Writing is
 * probed because some browsers expose the object and then throw on `setItem`.
 */
export function availableStorage(): StorageAdapter {
  try {
    const probe = `${STORAGE_PREFIX}probe`;
    globalThis.localStorage.setItem(probe, "1");
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return memoryFallback;
  }
}

/**
 * Read one stored value and hand it to `parse`. Returns null when the key is
 * absent, the value is not JSON, or the reader cannot be read at all, so callers
 * only ever see validated data or nothing.
 */
export function readJson<T>(
  key: string,
  parse: (raw: unknown) => T | null,
  storage: StorageAdapter = availableStorage(),
): T | null {
  let value: unknown;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  return parse(value);
}

/** Write one JSON value. Returns false when storage rejected the write. */
export function writeJson(
  key: string,
  value: unknown,
  storage: StorageAdapter = availableStorage(),
): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string, storage: StorageAdapter = availableStorage()): void {
  try {
    storage.removeItem(key);
  } catch {
    // Nothing to do: the caller asked for the data to be gone.
  }
}

/** Remove every key this app owns, leaving anything else in storage alone. */
export function clearAppStorage(storage: StorageAdapter = availableStorage()): void {
  const keys: string[] = [];
  const length = storage.length ?? 0;
  for (let index = 0; index < length; index += 1) {
    const key = storage.key?.(index) ?? null;
    if (key !== null && key.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => removeKey(key, storage));
}
