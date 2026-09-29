import { describe, expect, it } from "vitest";

import { contrastRatio, hueDistance, hueOf, saturation } from "./colors";
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
/** Below this saturation a colour has no hue worth comparing. */
const NEUTRAL = 0.08;

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

  it("lists each flag's colours once", () => {
    for (const country of flagCountries) {
      expect(new Set(country.colors).size, country.code).toBe(country.colors.length);
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
      expect(contrastRatio(theme.accent, theme.wrong), `${label} accent/wrong`).toBeGreaterThan(1);
      // Buttons paint their label on top of the accent, so it has to read there.
      expect(
        contrastRatio(theme.accent, theme.onAccent ?? "#ffffff"),
        `${label} on-accent`,
      ).toBeGreaterThanOrEqual(FLAG_TEXT_CONTRAST);
    }
  });

  it("paints every page in the flag's own colour", () => {
    for (const [index, theme] of flagThemes.entries()) {
      const field = flagCountries[index].colors[0];
      if (saturation(field) < NEUTRAL) continue;
      expect(hueDistance(theme.bg, field), `${theme.id} page`).toBeLessThanOrEqual(15);
    }
  });

  it("takes the accent from the flag", () => {
    for (const [index, theme] of flagThemes.entries()) {
      const vivid = flagCountries[index].colors.filter((color) => saturation(color) >= NEUTRAL);
      if (vivid.length === 0) continue;

      const nearest = Math.min(...vivid.map((color) => hueDistance(theme.accent, color)));
      expect(nearest, `${theme.id} accent ${theme.accent}`).toBeLessThanOrEqual(12);
    }
  });

  it("keeps the page and the panel apart", () => {
    for (const theme of flagThemes) {
      expect(theme.surface, theme.id).not.toBe(theme.bg);
    }
  });

  it("reads Argentina as blue, white and gold", () => {
    const argentina = getTheme("flag-ar");

    expect(argentina.dark).toBe(true);
    expect(hueDistance(argentina.bg, "#74acdf")).toBeLessThan(10);
    expect(argentina.accent).toBe("#f6b40e");
    expect(argentina.text).toBe("#ffffff");
  });

  it("reads Ukraine as blue and gold, and Libya as black", () => {
    const ukraine = getTheme("flag-ua");
    expect(ukraine.dark).toBe(true);
    expect(hueDistance(ukraine.bg, "#005bbb")).toBeLessThan(10);
    expect(ukraine.accent).toBe("#ffd500");

    // The black band is the widest part of Libya's flag, so it is the page.
    expect(getTheme("flag-ly").bg).toBe("#000000");
  });

  it("keeps a flag's own background recognisable", () => {
    // Bangladesh is a dark green flag with a red disc, not charcoal.
    const bangladesh = getTheme("flag-bd");
    expect(bangladesh.dark).toBe(true);
    expect(bangladesh.bg).toMatch(HEX);
    expect(hueOf(bangladesh.accent)).toBeGreaterThan(330);
    expect(bangladesh.bg).not.toBe(getTheme("flag-jp").bg);
  });

  it("uses both a light and a dark page across the catalogue", () => {
    const light = flagThemes.filter((theme) => !theme.dark);
    expect(light.length).toBeGreaterThan(10);
    expect(light.length).toBeLessThan(flagThemes.length);

    // White fields read as light pages: Japan's white and red.
    expect(getTheme("flag-jp").dark).toBe(false);
  });

  it("resolves a flag theme by id", () => {
    expect(getTheme("flag-se").label).toContain("Sweden");
  });
});
