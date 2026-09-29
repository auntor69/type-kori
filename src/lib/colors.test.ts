import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  hueDistance,
  hueOf,
  lightnessOf,
  luminance,
  mix,
  parseHex,
  saturation,
  toHex,
  withLightness,
} from "./colors";

describe("colour maths", () => {
  it("round-trips hex and rgb", () => {
    expect(parseHex("#0f2a42")).toEqual([15, 42, 66]);
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(toHex([15, 42, 66])).toBe("#0f2a42");
    expect(toHex([-10, 300, 12.6])).toBe("#00ff0d");
  });

  it("mixes toward the far colour", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mix("#000000", "#ffffff", 1)).toBe("#ffffff");
  });

  it("measures WCAG luminance and contrast", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#ffffff")).toBeCloseTo(1, 6);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 6);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
  });

  it("reads hue and saturation, and calls greys neutral", () => {
    expect(hueOf("#ff0000")).toBeCloseTo(0, 6);
    expect(hueOf("#00ff00")).toBeCloseTo(120, 6);
    expect(hueOf("#0000ff")).toBeCloseTo(240, 6);
    expect(saturation("#808080")).toBe(0);
    expect(saturation("#ff0000")).toBeCloseTo(1, 6);
    expect(lightnessOf("#808080")).toBeCloseTo(0.5, 2);
  });

  it("measures the gap between hues the short way round", () => {
    expect(hueDistance("#ff0000", "#0000ff")).toBeCloseTo(120, 6);
    expect(hueDistance("#ff0000", "#ff0a00")).toBeLessThan(3);
  });

  it("keeps the hue and the chroma when the lightness moves", () => {
    // Argentina's celeste, deepened into a page colour: mixing it with black
    // would leave slate, this leaves celeste.
    const deep = withLightness("#74acdf", 0.16);
    expect(lightnessOf(deep)).toBeCloseTo(0.16, 2);
    expect(hueDistance(deep, "#74acdf")).toBeLessThan(1);
    // Still a saturated blue, not the slate a mix toward black would leave.
    expect(saturation(deep)).toBeGreaterThan(0.5);
    expect(luminance(deep)).toBeLessThan(luminance("#74acdf"));

    expect(withLightness("#000000", 0.5)).toBe("#808080");
    expect(withLightness("#808080", 1)).toBe("#ffffff");
  });
});
