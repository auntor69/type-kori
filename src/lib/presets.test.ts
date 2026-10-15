import { describe, expect, it } from "vitest";

import { decodePreset, encodePreset, presetUrl } from "./presets";

/** A valid custom text: Bangla, long enough for the paste rules. */
const TEXT = "আমার সোনার বাংলা আমি তোমায় ভালোবাসি চিরদিন";

describe("encodePreset", () => {
  it("writes only the fields it was given", () => {
    expect(encodePreset({ time: 60 })).toBe("t=60");
    expect(encodePreset({ words: 25 })).toBe("w=25");
    expect(encodePreset({ funbox: "numbers" })).toBe("f=numbers");
    expect(encodePreset({ difficulty: "hard" })).toBe("d=hard");
    expect(encodePreset({ layout: "probhat" })).toBe("layout=probhat");
  });

  it("omits the default funbox and difficulty", () => {
    expect(encodePreset({ funbox: "none", difficulty: "all" })).toBe("");
  });

  it("prefers a word goal over a timer", () => {
    expect(encodePreset({ time: 60, words: 25 })).toBe("w=25");
  });

  it("encodes preset text so Bangla survives the round trip", () => {
    const search = encodePreset({ text: TEXT });
    expect(decodePreset(search)?.text).toBe(TEXT);
  });
});

describe("decodePreset", () => {
  it("returns null for a plain visit", () => {
    expect(decodePreset("")).toBeNull();
    expect(decodePreset("?daily=2026-10-11")).toBeNull();
    expect(decodePreset("?mistakes=1")).toBeNull();
  });

  it("accepts a leading question mark or a bare query", () => {
    expect(decodePreset("?t=30")).toEqual({ time: 30 });
    expect(decodePreset("t=30")).toEqual({ time: 30 });
  });

  it("drops a bad field instead of the whole link", () => {
    expect(decodePreset("?t=abc&f=numbers")).toEqual({ funbox: "numbers" });
    expect(decodePreset("?t=-5")).toBeNull();
    expect(decodePreset("?t=0")).toBeNull();
    expect(decodePreset("?t=999999")).toEqual({ time: 3600 });
  });

  it("keeps a word goal over a timer", () => {
    expect(decodePreset("?t=60&w=25")).toEqual({ words: 25 });
  });

  it("ignores an unknown funbox, difficulty or layout", () => {
    expect(decodePreset("?f=nope")).toBeNull();
    expect(decodePreset("?d=extreme")).toBeNull();
    expect(decodePreset("?layout=azerty")).toBeNull();
  });

  it("rejects preset text that could not have been pasted", () => {
    // Latin letters, and a passage shorter than the paste minimum.
    expect(decodePreset("?text=hello%20world%20this%20is%20not%20bangla")).toBeNull();
    expect(decodePreset("?text=%E0%A6%95")).toBeNull();
    // But it still accepts the link's other fields.
    expect(decodePreset(`?t=30&text=hello`)).toEqual({ time: 30 });
  });

  it("reads a full preset", () => {
    const search = encodePreset({
      words: 50,
      funbox: "punctuation",
      difficulty: "medium",
      layout: "national",
      text: TEXT,
    });
    expect(decodePreset(search)).toEqual({
      words: 50,
      funbox: "punctuation",
      difficulty: "medium",
      layout: "national",
      text: TEXT,
    });
  });
});

describe("presetUrl", () => {
  it("replaces any existing query so one link never carries two presets", () => {
    const url = presetUrl("https://typekori.vercel.app/", { time: 60 });
    expect(url).toBe("https://typekori.vercel.app/?t=60");
    expect(decodePreset(new URL(url).search)).toEqual({ time: 60 });
  });

  it("keeps the path and the origin", () => {
    const url = presetUrl("https://typekori.vercel.app/en/progress?t=30", { words: 10 });
    expect(url.startsWith("https://typekori.vercel.app/en/progress?")).toBe(true);
    expect(decodePreset(new URL(url).search)).toEqual({ words: 10 });
  });
});
