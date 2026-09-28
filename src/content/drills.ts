import drills from "../../content/lessons/drills.json";
import type { PracticeText } from "../engine/text/provider";
import { practiceTexts } from "./texts";

/**
 * Lesson drills. They use the same shape as a practice text, so the same build-time
 * validator and the same comparison rules apply to them. `reviewed` is false until
 * a native speaker checks them (`docs/VERIFY.md`).
 */
export const drillTexts = drills as PracticeText[];

const byId = new Map<string, PracticeText>(
  [...practiceTexts, ...drillTexts].map((text) => [text.id, text]),
);

/** A drill or a practice text, by id. A lesson may use either. */
export function textById(id: string): PracticeText | undefined {
  return byId.get(id);
}

/**
 * Resolve a list of ids. Missing ids are dropped here; the content validator
 * reports them so a typo fails the build instead of quietly shrinking a lesson.
 */
export function textsByIds(ids: readonly string[]): PracticeText[] {
  return ids.map(textById).filter((text): text is PracticeText => text !== undefined);
}
