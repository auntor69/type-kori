/**
 * Hand-written types for `scripts/generate-og.mjs`.
 *
 * The generator is plain JavaScript because it runs both as a build step and as a
 * command-line script (`node scripts/generate-og.mjs`), and the tsconfig does not
 * enable `allowJs`. This file is what lets the TypeScript tests import its pure
 * helpers and hold them to the layout's own slug rule.
 */

export declare const OG_WIDTH: number;
export declare const OG_HEIGHT: number;
export declare const OG_CARD_DIR: string;

export interface OgPage {
  /** Site-root-relative URL of the built page, e.g. `/guides/`. */
  url: string;
  lang: "bn" | "en";
  /** The raw `<title>` of the built page. */
  title: string;
}

export declare function cardTitle(title: string): string;
export declare function pageSlug(url: string, lang?: "bn" | "en"): string;
export declare function wrapTitle(title: string, maxChars?: number, lines?: number): string[];
export declare function cardSvg(options: {
  title: string;
  lang?: "bn" | "en";
  slug?: string;
}): string;
export declare function fontFile(): string;
export declare function renderCard(options: {
  title: string;
  lang?: "bn" | "en";
  slug?: string;
}): Promise<Buffer>;
export declare function collectPages(distDir: string): OgPage[];
export declare function generateCards(
  distDir: string,
  options?: { pages?: OgPage[] },
): Promise<string[]>;
