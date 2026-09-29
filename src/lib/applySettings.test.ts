import { describe, expect, it } from "vitest";

import { applySettings, THEME_VAR_NAMES } from "./applySettings";
import { defaultSettings } from "./settings";
import { getTheme, themeStyleVars } from "./themes";

/** A stand-in for `document.documentElement`: only what applySettings touches. */
function fakeRoot(): { root: HTMLElement; props: Map<string, string>; data: Record<string, string> } {
  const props = new Map<string, string>();
  const data: Record<string, string> = {};

  const root = {
    style: {
      setProperty: (name: string, value: string) => void props.set(name, value),
      removeProperty: (name: string) => void props.delete(name),
      colorScheme: "",
    },
    dataset: data,
    setAttribute: (name: string, value: string) => void (data[name] = value),
    removeAttribute: (name: string) => void delete data[name],
  } as unknown as HTMLElement;

  return { root, props, data };
}

describe("applySettings", () => {
  it("paints a concrete theme onto the root", () => {
    const { root, props, data } = fakeRoot();
    applySettings({ ...defaultSettings, theme: "flag-bd" }, root);

    const theme = getTheme("flag-bd");
    expect(props.get("--bg")).toBe(theme.bg);
    expect(props.get("--accent")).toBe(theme.accent);
    expect(data.theme).toBe(theme.dark ? "dark" : "light");
    expect(root.style.colorScheme).toBe(theme.dark ? "dark" : "light");
  });

  it("paints a light flag theme with color-scheme light", () => {
    const light = getTheme("flag-sm");
    const { root, data } = fakeRoot();
    applySettings({ ...defaultSettings, theme: "flag-sm" }, root);

    expect(data.theme).toBe(light.dark ? "dark" : "light");
    expect(root.style.colorScheme).toBe(light.dark ? "dark" : "light");
  });

  it("clears every theme property when the choice goes back to system", () => {
    const { root, props } = fakeRoot();
    applySettings({ ...defaultSettings, theme: "nord" }, root);
    expect(props.size).toBeGreaterThan(0);

    applySettings({ ...defaultSettings, theme: "system" }, root);
    for (const name of THEME_VAR_NAMES) expect(props.has(name), name).toBe(false);
    // Only the non-theme properties applySettings always publishes are left.
    expect([...props.keys()].sort()).toEqual(["--typing-size"]);
  });

  it("clears exactly the properties a theme sets, no more and no less", () => {
    const set = Object.keys(themeStyleVars(getTheme("dracula"))).sort();
    expect([...THEME_VAR_NAMES].sort()).toEqual(set);
  });

  it("publishes the text size and the input mode", () => {
    const { root, props, data } = fakeRoot();
    applySettings({ ...defaultSettings, fontSize: 36, inputMode: "avro-phonetic" }, root);

    expect(props.get("--typing-size")).toBe("36px");
    expect(data.inputMode).toBe("avro-phonetic");
  });
});
