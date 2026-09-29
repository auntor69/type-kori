import { describe, expect, it } from "vitest";

import {
  allThemes,
  applyThemeVars,
  exportTheme,
  getTheme,
  isThemeId,
  searchThemes,
  themeCategoryOf,
  themeLabel,
  themes,
  themeStyleVars,
} from "./themes";

describe("theme registry", () => {
  it("has unique ids", () => {
    const ids = allThemes.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(allThemes.length).toBeGreaterThan(themes.length + 150);
  });

  it("sorts the hand-written themes into light and dark", () => {
    expect(themeCategoryOf(getTheme("serika"))).toBe("dark");
    expect(themeCategoryOf(getTheme("paper"))).toBe("light");
    expect(themeCategoryOf(getTheme("flag-bd"))).toBe("flags");
    expect(themeLabel(getTheme("paper"))).toBe("paper");
  });

  it("searches and filters for the picker", () => {
    expect(searchThemes("", "dark").every((theme) => theme.dark)).toBe(true);
    expect(searchThemes("", "flags").length).toBeGreaterThan(190);
    expect(searchThemes("nord", "all").map((theme) => theme.id)).toContain("nord");
    expect(searchThemes("bangladesh", "all").map((theme) => theme.id)).toContain("flag-bd");
    expect(searchThemes("", "favourites", ["nord", "flag-bd"]).map((theme) => theme.id)).toEqual([
      "nord",
      "flag-bd",
    ]);
    expect(searchThemes("flag-", "dark").length).toBe(0);
  });

  it("optimises nothing away with an empty query and no favourites", () => {
    expect(searchThemes("", "favourites", [])).toEqual([]);
  });

  it("exports a theme as JSON", () => {
    const parsed = JSON.parse(exportTheme(getTheme("nord"))) as {
      kind: string;
      theme: { id: string; vars: Record<string, string> };
    };

    expect(parsed.kind).toBe("theme");
    expect(parsed.theme.id).toBe("nord");
    expect(parsed.theme.vars["--bg"]).toBe("#2e3440");
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
