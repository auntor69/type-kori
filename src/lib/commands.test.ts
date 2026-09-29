import { describe, expect, it } from "vitest";

import { parseCommand } from "./commands";

describe("parseCommand", () => {
  it("parses the test type", () => {
    expect(parseCommand("time 60")).toEqual({ kind: "run", name: "time", durationMs: 3_600_000 });
    expect(parseCommand("t 5")).toEqual({ kind: "run", name: "time", durationMs: 300_000 });
    expect(parseCommand("time 1m")).toEqual({ kind: "run", name: "time", durationMs: 60_000 });
    expect(parseCommand("time infinite")).toEqual({ kind: "run", name: "time", durationMs: null });
    expect(parseCommand("time")).toEqual({ kind: "run", name: "time", durationMs: null });

    expect(parseCommand("words 25")).toEqual({ kind: "run", name: "words", goal: 25 });
    expect(parseCommand("w 25w")).toEqual({ kind: "run", name: "words", goal: 25 });
    expect(parseCommand("words ∞")).toEqual({ kind: "run", name: "words", goal: null });
  });

  it("refuses an out-of-range number instead of clamping silently", () => {
    expect(parseCommand("time 0")).toEqual({ kind: "run", name: "time", durationMs: 0 });
    expect(parseCommand("time 5000")).toBeNull();
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
