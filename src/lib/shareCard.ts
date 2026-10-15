/**
 * The result share card: a PNG of a finished run, drawn in the browser.
 *
 * Nothing is uploaded and no service is called — the canvas is painted locally
 * and the user gets a file (or the OS share sheet) they can send wherever they
 * like. The drawing is separated from the data so the text of the card can be
 * unit tested, and `drawResultCard` takes a structural canvas context so the
 * drawing path is testable without a real canvas.
 */

import { formatDuration } from "../engine/metrics";
import type { Lang } from "../i18n";

/** The subset of `CanvasRenderingContext2D` the card uses. */
export interface CardContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  fill(): void;
  beginPath(): void;
  roundRect?(x: number, y: number, width: number, height: number, radii?: number | number[]): void;
}

export interface CardPalette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  wrong: string;
}

export interface CardMistake {
  target: string;
  expected: string;
  typed: string;
}

export interface ResultCardData {
  wpm: number;
  kpm: number;
  accuracy: number;
  consistency: number;
  elapsedMs: number;
  testType: string;
  mistakes: readonly CardMistake[];
  lang: Lang;
  /** Digits are rendered with this style, matching the results screen. */
  numerals: "latin" | "bengali";
}

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

/** Localised labels for the card, kept here so the card is self-contained. */
const LABELS = {
  wpm: { bn: "গতি (WPM)", en: "Speed (WPM)" },
  accuracy: { bn: "নির্ভুলতা", en: "Accuracy" },
  time: { bn: "সময়", en: "Time" },
  consistency: { bn: "নিয়মিততা", en: "Consistency" },
  combo: { bn: "কিস্ট্রোক/মিনিট", en: "Keystrokes/min" },
  mistakes: { bn: "ভুল", en: "mistakes" },
  tagline: {
    bn: "বাংলা টাইপিং শিখুন, দ্রুত ও সহজে",
    en: "Learn Bangla typing. Free, fast, no sign-up.",
  },
} as const;

/** The big number on the card. */
export function cardHeadline(data: ResultCardData): string {
  return `${data.wpm}`;
}

export function cardHeadlineLabel(data: ResultCardData): string {
  return LABELS.wpm[data.lang];
}

/** The line under the headline: accuracy and the test type. */
export function cardSubtitle(data: ResultCardData): string {
  const accuracy = `${data.accuracy}%`;
  return `${LABELS.accuracy[data.lang]} ${accuracy} · ${data.testType}`;
}

/** The stat strip along the bottom of the card. */
export function cardStats(data: ResultCardData): { label: string; value: string }[] {
  return [
    { label: LABELS.accuracy[data.lang], value: `${data.accuracy}%` },
    { label: LABELS.time[data.lang], value: formatDuration(data.elapsedMs) },
    { label: LABELS.consistency[data.lang], value: `${data.consistency}%` },
    { label: LABELS.combo[data.lang], value: `${data.kpm}` },
  ];
}

/** `type-kori-42wpm-2026-10-11.png`, so a folder of cards stays sortable. */
export function resultCardFilename(
  data: Pick<ResultCardData, "wpm">,
  now: number = Date.now(),
): string {
  const day = new Date(now).toISOString().slice(0, 10);
  return `type-kori-${data.wpm}wpm-${day}.png`;
}

/**
 * Paint the card. Pure drawing: it never reads the network and never throws for
 * a missing optional method (older canvas implementations lack `roundRect`).
 */
export function drawResultCard(
  ctx: CardContext,
  data: ResultCardData,
  palette: CardPalette,
): void {
  // Background, with a quiet accent bar down the left edge.
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, 14, CARD_HEIGHT);

  // Brand line.
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = palette.accent;
  ctx.font = "600 40px 'Inter Variable', system-ui, sans-serif";
  ctx.fillText("Type Kori", 72, 108);
  ctx.fillStyle = palette.muted;
  ctx.font = "400 28px 'Noto Sans Bengali Variable', system-ui, sans-serif";
  ctx.fillText(LABELS.tagline[data.lang], 72, 156);

  // The headline number, big.
  ctx.fillStyle = palette.accent;
  ctx.font = "700 190px 'Inter Variable', system-ui, sans-serif";
  ctx.fillText(cardHeadline(data), 64, 372);

  // Label under the number, indented past it.
  ctx.fillStyle = palette.text;
  ctx.font = "600 34px 'Noto Sans Bengali Variable', system-ui, sans-serif";
  ctx.fillText(cardHeadlineLabel(data), 76, 430);

  ctx.fillStyle = palette.muted;
  ctx.font = "400 30px 'Noto Sans Bengali Variable', system-ui, sans-serif";
  ctx.fillText(cardSubtitle(data), 76, 478);

  // Stat chips across the bottom.
  const stats = cardStats(data);
  const chipWidth = 250;
  stats.forEach((stat, index) => {
    const x = 72 + index * (chipWidth + 20);
    ctx.fillStyle = palette.surface;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, 512, chipWidth, 86, 14);
      ctx.fill();
    } else {
      ctx.fillRect(x, 512, chipWidth, 86);
    }

    ctx.fillStyle = palette.muted;
    ctx.font = "600 20px 'Noto Sans Bengali Variable', system-ui, sans-serif";
    ctx.fillText(stat.label, x + 20, 546);

    ctx.fillStyle = palette.text;
    ctx.font = "600 34px 'Inter Variable', system-ui, sans-serif";
    ctx.fillText(stat.value, x + 20, 584);
  });

  // Mistake count, only when there is something to say.
  if (data.mistakes.length > 0) {
    ctx.textAlign = "right";
    ctx.fillStyle = palette.wrong;
    ctx.font = "600 26px 'Noto Sans Bengali Variable', system-ui, sans-serif";
    ctx.fillText(`${data.mistakes.length} ${LABELS.mistakes[data.lang]}`, CARD_WIDTH - 72, 156);
    ctx.textAlign = "left";
  }
}
