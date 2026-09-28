import easy from "../../content/texts/easy.json";
import hard from "../../content/texts/hard.json";
import medium from "../../content/texts/medium.json";
import type { PracticeText } from "../engine/text/provider";

/**
 * Every practice text, straight from `content/texts/`. The JSON is validated at
 * build time by scripts/validate-text.ts, which is why the cast is safe here.
 */
export const practiceTexts = [...easy, ...medium, ...hard] as PracticeText[];
