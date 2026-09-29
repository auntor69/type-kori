import { describe, expect, it } from "vitest";

import { parseCommand, settingPatch } from "./commands";

describe("parseCommand", () => {
  it("parses the test type", () => {
    expect(parseCommand("time 60")).toEqual({ kind: "run", name: "time", durationMs: 60_000 });
    expect(parseCommand("t 5")).toEqual({ kind: "run", name: "time", durationMs: 5_000 });
    expect(parseCommand("time 1m")).toEqual({ kind: "run", name: "time", durationMs: 60_000 });
    expect(parseCommand("time infinite")).toEqual({ kind: "run", name: "time", durationMs: null });
    expect(parseCommand("time")).toEqual({ kind: "run", name: "time", durationMs: null });

    expect(parseCommand("words 25")).toEqual({ kind: "run", name: "words", goal: 25 });
    expect(parseCommand("w 25w")).toEqual({ kind: "run", name: "words", goal: 25 });
    expect(parseCommand("words ∞")).toEqual({ kind: "run", name: "words", goal: null });
  });

  it("counts a bare time in seconds and lets a suffix say otherwise", () => {
    expect(parseCommand("time 90")).toEqual({ kind: "run", name: "time", durationMs: 90_000 });
    expect(parseCommand("time 90s")).toEqual({ kind: "run", name: "time", durationMs: 90_000 });
    expect(parseCommand("time 5m")).toEqual({ kind: "run", name: "time", durationMs: 300_000 });
    expect(parseCommand("time 2min")).toEqual({ kind: "run", name: "time", durationMs: 120_000 });
    expect(parseCommand("time 45sec")).toEqual({ kind: "run", name: "time", durationMs: 45_000 });
  });

  it("refuses an out-of-range number instead of clamping silently", () => {
    expect(parseCommand("time 0")).toEqual({ kind: "run", name: "time", durationMs: 0 });
    expect(parseCommand("time 5000")).toBeNull();
    expect(parseCommand("time 61m")).toBeNull();
    expect(parseCommand("time soon")).toBeNull();
    expect(parseCommand("words 5000")).toBeNull();
    expect(parseCommand("words none")).toBeNull();
  });

  it("parses the run controls", () => {
    expect(parseCommand("restart")).toEqual({ kind: "run", name: "restart" });
    expect(parseCommand("next")).toEqual({ kind: "run", name: "next" });
    expect(parseCommand("end")).toEqual({ kind: "run", name: "end" });
    expect(parseCommand("weak")).toEqual({ kind: "run", name: "weak" });
    expect(parseCommand("custom")).toEqual({ kind: "run", name: "custom" });
  });

  it("parses a theme, including a flag theme", () => {
    expect(parseCommand("theme dracula")).toEqual({ kind: "setting", name: "theme", theme: "dracula" });
    expect(parseCommand("theme flag-bd")).toEqual({ kind: "setting", name: "theme", theme: "flag-bd" });
    expect(parseCommand("theme system")).toEqual({ kind: "setting", name: "theme", theme: "system" });
    expect(parseCommand("theme not-a-theme")).toBeNull();
  });

  it("strips a leading command-line prefix", () => {
    expect(parseCommand("/theme nord")).toEqual({ kind: "setting", name: "theme", theme: "nord" });
    expect(parseCommand(">words 10")).toEqual({ kind: "run", name: "words", goal: 10 });
    expect(parseCommand(":goto progress")).toEqual({ kind: "go", path: "/progress" });
  });

  it("accepts short forms of the setting names", () => {
    expect(parseCommand("diff hard")).toEqual({
      kind: "setting",
      name: "difficulty",
      difficulty: "hard",
    });
    expect(parseCommand("fun numbers")).toEqual({
      kind: "setting",
      name: "funbox",
      funbox: "numbers",
    });
    expect(parseCommand("conf max")).toEqual({
      kind: "setting",
      name: "confidence",
      confidence: "max",
    });
    expect(parseCommand("typos below")).toEqual({
      kind: "setting",
      name: "typos",
      indicateTypos: "below",
    });
  });

  it("parses booleans for the toggles", () => {
    expect(parseCommand("blind on")).toEqual({ kind: "setting", name: "blind", blindMode: true });
    expect(parseCommand("focus off")).toEqual({
      kind: "setting",
      name: "focus",
      focusMode: false,
    });
    expect(parseCommand("livewpm yes")).toEqual({
      kind: "setting",
      name: "liveWpm",
      liveWpm: true,
    });
    expect(parseCommand("hideextra 1")).toEqual({
      kind: "setting",
      name: "hideExtra",
      hideExtraLetters: true,
    });
    expect(parseCommand("capswarning enable")).toEqual({
      kind: "setting",
      name: "capsWarning",
      capsLockWarning: true,
    });
    expect(parseCommand("blind sometimes")).toBeNull();
  });

  it("parses numbers and enumerations", () => {
    expect(parseCommand("font 32")).toEqual({ kind: "setting", name: "font", fontSize: 32 });
    expect(parseCommand("font huge")).toBeNull();
    expect(parseCommand("volume 40")).toEqual({ kind: "setting", name: "volume", volume: 40 });
    expect(parseCommand("volume 400")).toBeNull();
    expect(parseCommand("sound both")).toEqual({ kind: "setting", name: "sound", sound: "both" });
    expect(parseCommand("caret underline")).toEqual({ kind: "setting", name: "caret", caret: "underline" });
    expect(parseCommand("numerals bengali")).toEqual({
      kind: "setting",
      name: "numerals",
      numerals: "bengali",
    });
    expect(parseCommand("stop word")).toEqual({
      kind: "setting",
      name: "stopOnError",
      stopOnError: "word",
    });
    expect(parseCommand("history always")).toEqual({
      kind: "setting",
      name: "wordHistory",
      history: "always",
    });
    expect(parseCommand("restartkey tab")).toEqual({
      kind: "setting",
      name: "quickRestart",
      quickRestart: "tab",
    });
    expect(parseCommand("lang en")).toEqual({ kind: "setting", name: "lang", lang: "en" });
    expect(parseCommand("lang klingon")).toBeNull();
  });

  it("parses navigation", () => {
    expect(parseCommand("goto")).toEqual({ kind: "go", path: "/" });
    expect(parseCommand("go lessons")).toEqual({ kind: "go", path: "/lessons" });
    expect(parseCommand("goto progress")).toEqual({ kind: "go", path: "/progress" });
    expect(parseCommand("goto stats")).toEqual({ kind: "go", path: "/progress" });
    expect(parseCommand("goto privacy")).toEqual({ kind: "go", path: "/privacy" });
    expect(parseCommand("goto nowhere")).toBeNull();
  });

  it("returns null for anything it does not understand", () => {
    expect(parseCommand("")).toBeNull();
    expect(parseCommand("   ")).toBeNull();
    expect(parseCommand("fly me to the moon")).toBeNull();
    expect(parseCommand("theme")).toBeNull();
  });
});

/** Every command the palette or the command line can produce, and what it does. */
const PATCHES: readonly [string, Record<string, unknown> | null][] = [
  ["theme dracula", { theme: "dracula" }],
  ["theme flag-jp", { theme: "flag-jp" }],
  ["theme system", { theme: "system" }],
  ["difficulty easy", { difficulty: "easy" }],
  ["funbox numbers", { funbox: "numbers" }],
  ["sound both", { sound: "both" }],
  ["volume 40", { soundVolume: 40 }],
  ["caret underline", { caretStyle: "underline" }],
  ["font 32", { fontSize: 32 }],
  ["font 5000", { fontSize: 48 }],
  ["numerals bengali", { numerals: "bengali" }],
  ["stop word", { stopOnError: "word" }],
  ["conf max", { confidenceMode: "max" }],
  ["restartkey tab", { quickRestart: "tab" }],
  ["typos below", { indicateTypos: "below" }],
  ["history always", { wordHistory: "always" }],
  ["blind on", { blindMode: true }],
  ["focus on", { focusMode: true }],
  ["livewpm off", { liveWpm: false }],
  ["hideextra on", { hideExtraLetters: true }],
  ["capswarning off", { capsLockWarning: false }],
];

describe("settingPatch", () => {
  it("turns every settings command into the patch the drawer would write", () => {
    for (const [input, expected] of PATCHES) {
      const command = parseCommand(input);
      expect(command, input).not.toBeNull();
      expect(settingPatch(command as NonNullable<typeof command>), input).toEqual(expected);
    }
  });

  it("leaves run commands and navigation to their own handlers", () => {
    for (const input of ["restart", "next", "end", "weak", "custom", "time 60", "words 25"]) {
      const command = parseCommand(input);
      expect(command?.kind, input).toBe("run");
      expect(settingPatch(command as NonNullable<typeof command>), input).toBeNull();
    }

    for (const input of ["goto progress", "lang en"]) {
      const command = parseCommand(input);
      expect(settingPatch(command as NonNullable<typeof command>), input).toBeNull();
    }
  });

  it("covers every setting the palette offers, leaving no silent no-op", () => {
    const patched = PATCHES.flatMap(([, patch]) => Object.keys(patch ?? {}));
    const keys = new Set(patched);

    // The settings a command can change; anything missing here would parse and
    // then do nothing at all.
    for (const key of [
      "theme",
      "difficulty",
      "funbox",
      "sound",
      "soundVolume",
      "caretStyle",
      "fontSize",
      "numerals",
      "stopOnError",
      "confidenceMode",
      "quickRestart",
      "indicateTypos",
      "wordHistory",
      "blindMode",
      "focusMode",
      "liveWpm",
      "hideExtraLetters",
      "capsLockWarning",
    ]) {
      expect(keys.has(key), key).toBe(true);
    }
  });
});
