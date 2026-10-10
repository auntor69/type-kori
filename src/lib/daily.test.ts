import { describe, expect, it } from "vitest";

import { dayKey, daySeed, isDayKey, seedFromKey } from "./daily";

describe("dayKey", () => {
  it("formats a local day with zero padding", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 9, 10))).toBe("2026-10-10");
  });

  it("uses the local calendar day, not UTC", () => {
    // 23:30 local on the 9th is already the 10th in UTC for a +06:00 zone.
    expect(dayKey(new Date(2026, 9, 9, 23, 30))).toBe("2026-10-09");
  });
});

describe("isDayKey", () => {
  it("accepts a real date", () => {
    expect(isDayKey("2026-10-10")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isDayKey("2026-13-01")).toBe(false);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("2026-2-3")).toBe(false);
    expect(isDayKey("daily")).toBe(false);
    expect(isDayKey(2026)).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
  });
});

describe("seedFromKey", () => {
  it("is deterministic", () => {
    expect(seedFromKey("2026-10-10")).toBe(seedFromKey("2026-10-10"));
  });

  it("differs between days", () => {
    expect(seedFromKey("2026-10-10")).not.toBe(seedFromKey("2026-10-11"));
  });

  it("stays inside the run-seed range and is never 0", () => {
    for (const key of ["2026-01-01", "2026-10-10", "", "x"]) {
      const seed = seedFromKey(key);
      expect(seed).toBeGreaterThan(0);
      expect(seed).toBeLessThan(0x7fff_ffff);
    }
  });
});

describe("daySeed", () => {
  it("is the seed of that day's key", () => {
    const date = new Date(2026, 9, 10);
    expect(daySeed(date)).toBe(seedFromKey("2026-10-10"));
  });

  it("gives every day of a month a different seed", () => {
    const seeds = new Set<string>();
    for (let day = 1; day <= 28; day += 1) {
      seeds.add(String(daySeed(new Date(2026, 9, day))));
    }
    expect(seeds.size).toBe(28);
  });
});
