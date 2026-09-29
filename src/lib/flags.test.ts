import { describe, expect, it } from "vitest";

import { contrastRatio } from "./colors";
import {
  FLAG_SOFT_CONTRAST,
  FLAG_TEXT_CONTRAST,
  flagCountries,
  flagEmoji,
  flagThemeId,
  flagThemes,
} from "./flags";
import { allThemes, getTheme, isThemeId } from "./themes";

const HEX = /^#[0-9a-f]{6}$/;

describe("flag table", () => {
  it("covers essentially every country", () => {
    expect(flagCountries.length).toBeGreaterThanOrEqual(190);
  });

  it("uses unique two-letter codes and non-empty names", () => {
    const codes = flagCountries.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);

    for (const country of flagCountries) {
      expect(country.code, country.name).toMatch(/^[a-z]{2}$/);
      expect(country.name.trim().length, country.code).toBeGreaterThan(1);
      expect(country.colors.length, country.code).toBeGreaterThanOrEqual(2);
      expect(country.colors.length, country.code).toBeLessThanOrEqual(5);
      for (const color of country.colors) {
        expect(color, country.code).toMatch(HEX);
      }
    }
  });

  it("turns a code into its flag emoji without any image data", () => {
    expect(flagEmoji("bd")).toBe("🇧🇩");
    expect(flagEmoji("jp")).toBe("🇯🇵");
    expect(flagEmoji("GB")).toBe("🇬🇧");
  });
});

describe("flag themes", () => {
  it("builds one theme per country, with unique ids", () => {
    expect(flagThemes.length).toBe(flagCountries.length);

    const ids = flagThemes.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const [index, theme] of flagThemes.entries()) {
      const country = flagCountries[index];
      expect(theme.id).toBe(flagThemeId(country.code));
      expect(theme.label).toContain(country.name);
      expect(allThemes).toContain(theme);
      expect(isThemeId(theme.id)).toBe(true);
    }
  });

  it("never ships an unreadable palette", () => {
    for (const theme of flagThemes) {
      const label = theme.label ?? theme.id;
      expect(contrastRatio(theme.text, theme.bg), `${label} text`).toBeGreaterThanOrEqual(
        FLAG_TEXT_CONTRAST,
      );
      expect(contrastRatio(theme.muted, theme.bg), `${label} muted`).toBeGreaterThanOrEqual(
        FLAG_SOFT_CONTRAST,
      );
      expect(contrastRatio(theme.accent, theme.bg), `${label} accent`).toBeGreaterThanOrEqual(
        FLAG_SOFT_CONTRAST,
      );
      expect(contrastRatio(theme.wrong, theme.bg), `${label} wrong`).toBeGreaterThanOrEqual(
        FLAG_SOFT_CONTRAST,
      );
    }
  });

  it("keeps a flag's own background recognisable", () => {
    // Bangladesh is a dark green flag: the theme must be dark, not charcoal grey.
    const bangladesh = getTheme("flag-bd");
    expect(bangladesh.dark).toBe(true);
    expect(bangladesh.accent).toMatch(HEX);
    expect(bangladesh.bg).not.toBe(getTheme("flag-jp").bg);
  });

  it("resolves a flag theme by id", () => {
    expect(getTheme("flag-se").label).toContain("Sweden");
  });
});
