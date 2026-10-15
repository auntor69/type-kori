import { describe, expect, it } from "vitest";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  cardHeadline,
  cardHeadlineLabel,
  cardStats,
  cardSubtitle,
  drawResultCard,
  resultCardFilename,
  type CardContext,
  type ResultCardData,
} from "./shareCard";

const data: ResultCardData = {
  wpm: 42,
  kpm: 210,
  accuracy: 96.5,
  consistency: 88,
  elapsedMs: 61_000,
  testType: "time 60",
  mistakes: [{ target: "কেমন", expected: "ম", typed: "ন" }],
  lang: "bn",
  numerals: "latin",
};

interface Call {
  kind: "rect" | "text" | "fill";
  text?: string;
  rect?: number[];
  fillStyle: string;
}

/** A structural stand-in for a canvas context that records what was drawn. */
function stubContext(roundRect = true): { ctx: CardContext; calls: Call[] } {
  const calls: Call[] = [];
  const ctx = {
    fillStyle: "",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillRect(x: number, y: number, width: number, height: number) {
      calls.push({ kind: "rect", rect: [x, y, width, height], fillStyle: String(ctx.fillStyle) });
    },
    fillText(text: string) {
      calls.push({ kind: "text", text: String(text), fillStyle: String(ctx.fillStyle) });
    },
    fill() {
      calls.push({ kind: "fill", fillStyle: String(ctx.fillStyle) });
    },
    beginPath() {},
    ...(roundRect
      ? {
          roundRect(x: number, y: number, width: number, height: number) {
            calls.push({ kind: "rect", rect: [x, y, width, height], fillStyle: String(ctx.fillStyle) });
          },
        }
      : {}),
  } as unknown as CardContext;

  return { ctx, calls };
}

const palette = {
  bg: "#2c2e31",
  surface: "#323437",
  text: "#d1d0c9",
  muted: "#646669",
  accent: "#e2b714",
  wrong: "#ca4754",
};

describe("the card text", () => {
  it("leads with the speed", () => {
    expect(cardHeadline(data)).toBe("42");
    expect(cardHeadlineLabel(data)).toBe("গতি (WPM)");
    expect(cardHeadlineLabel({ ...data, lang: "en" })).toBe("Speed (WPM)");
  });

  it("summarises accuracy and the test type", () => {
    expect(cardSubtitle(data)).toBe("নির্ভুলতা 96.5% · time 60");
  });

  it("lists the four stat chips in the reader's language", () => {
    const bn = cardStats(data).map((stat) => stat.label);
    expect(bn).toEqual(["নির্ভুলতা", "সময়", "নিয়মিততা", "কিস্ট্রোক/মিনিট"]);
    expect(cardStats(data).map((stat) => stat.value)).toEqual(["96.5%", "1:01", "88%", "210"]);

    const en = cardStats({ ...data, lang: "en" }).map((stat) => stat.label);
    expect(en).toEqual(["Accuracy", "Time", "Consistency", "Keystrokes/min"]);
  });
});

describe("the file name", () => {
  it("carries the speed and the date, so a folder of cards sorts", () => {
    expect(resultCardFilename({ wpm: 42 }, Date.UTC(2026, 9, 11))).toBe(
      "type-kori-42wpm-2026-10-11.png",
    );
  });
});

describe("drawResultCard", () => {
  it("paints a full-width background and the brand line", () => {
    const { ctx, calls } = stubContext();
    drawResultCard(ctx, data, palette);

    expect(calls[0]).toEqual({ kind: "rect", rect: [0, 0, CARD_WIDTH, CARD_HEIGHT], fillStyle: palette.bg });
    const texts = calls.filter((call) => call.kind === "text").map((call) => call.text ?? "");
    expect(texts).toContain("Type Kori");
    expect(texts).toContain("42");
    expect(texts.some((text) => text.includes("96.5%"))).toBe(true);
  });

  it("draws every stat chip and the mistake count", () => {
    const { ctx, calls } = drawAndCollect(data, true);
    const texts = calls.filter((call) => call.kind === "text").map((call) => call.text ?? "");

    for (const stat of cardStats(data)) {
      expect(texts, stat.label).toContain(stat.label);
    }
    expect(texts).toContain("1 ভুল");
  });

  it("falls back to square chips when roundRect is missing", () => {
    const { calls } = drawAndCollect(data, false);
    // Four chips drawn with fillRect at the chip row, not the rounded path.
    const chipRects = calls.filter(
      (call) => call.kind === "rect" && call.rect?.[1] === 512,
    );
    expect(chipRects).toHaveLength(4);
    expect(calls.some((call) => call.kind === "fill")).toBe(false);
  });

  it("says nothing about mistakes when there were none", () => {
    const { calls } = drawAndCollect({ ...data, mistakes: [] }, true);
    const texts = calls.filter((call) => call.kind === "text").map((call) => call.text ?? "");
    // The count line only: "নির্ভুলতা" (accuracy) itself contains the same letters.
    expect(texts).not.toContain("1 ভুল");
    expect(texts.some((text) => /^\d+ ভুল$/.test(text))).toBe(false);
  });
});

function drawAndCollect(
  value: ResultCardData,
  roundRect: boolean,
): { ctx: CardContext; calls: Call[] } {
  const { ctx, calls } = stubContext(roundRect);
  drawResultCard(ctx, value, palette);
  return { ctx, calls };
}
