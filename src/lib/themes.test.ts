import { describe, expect, it } from "vitest";

import { applyThemeVars, getTheme, isThemeId, themes, themeStyleVars } from "./themes";

describe("theme registry", () => {
  it("has unique ids", () => {
    const ids = themes.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps serika and paper as the built-in palettes", () => {
    expect(getTheme("serika").accent).toBe("#e2b714");
    expect(getTheme("paper").dark).toBe(false);
  });

  it("rejects unknown theme ids", () => {
    expect(isThemeId("nord")).toBe(true);
    expect(isThemeId("not-a-theme")).toBe(false);
    expect(isThemeId(42)).toBe(false);
  });

  it("derives the line and surface colours from the base palette", () => {
    const vars = themeStyleVars(getTheme("nord"));

    expect(vars["--bg"]).toBe("#2e3440");
    expect(vars["--correct"]).toBe(vars["--text"]);
    expect(vars["--accent-2"]).toBe(vars["--wrong"]);
    expect(vars["--border"]).not.toBe(vars["--bg"]);
    expect(vars["--border-strong"]).not.toBe(vars["--border"]);
  });

  it("applies every variable to the root element", () => {
    const stored: Record<string, string> = {};
    const root = {
      style: {
        setProperty: (name: string, value: string) => void (stored[name] = value),
        colorScheme: "",
      },
    } as unknown as HTMLElement;

    applyThemeVars(getTheme("terminal"), root);

    expect(stored["--bg"]).toBe("#000000");
    expect(stored["--accent"]).toBe("#33ff66");
  });
});
