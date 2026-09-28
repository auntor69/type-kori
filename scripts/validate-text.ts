/**
 * Content validator.
 *
 * Fails when a practice text or a lesson drill contains characters outside the
 * Bengali block, has broken metadata, or is a duplicate, and when a lesson points
 * at a drill id that does not exist. Texts that have not been reviewed by a native
 * speaker are listed as a warning, and fail only with `--strict`, which becomes the
 * production setting once the review pass is complete (docs/VERIFY.md).
 *
 * Run with: bun run validate:text
 */

import drills from "../content/lessons/drills.json";
import easy from "../content/texts/easy.json";
import hard from "../content/texts/hard.json";
import medium from "../content/texts/medium.json";
import { textById } from "../src/content/drills";
import { lessons } from "../src/content/lessons";
import { practiceTexts } from "../src/content/texts";
import { validateTextSet } from "../src/engine/text/provider";

const sets: Record<string, unknown> = { easy, medium, hard, lessons: drills };
const strict = process.argv.includes("--strict");

const errors: string[] = [];
const unreviewed: string[] = [];
let total = 0;

for (const [name, entries] of Object.entries(sets)) {
  const report = validateTextSet(entries);
  errors.push(...report.errors.map((error) => `${name}: ${error}`));
  unreviewed.push(...report.unreviewed);
  total += Array.isArray(entries) ? entries.length : 0;
}

// A drill must not shadow a practice text, and every lesson must point at
// something that exists; a typo here would quietly shrink a lesson.
const practiceIds = new Set(practiceTexts.map((text) => text.id));
for (const drill of drills) {
  if (practiceIds.has(drill.id)) errors.push(`lessons: ${drill.id} reuses a practice text id`);
}

const slugs = new Set<string>();
for (const lesson of lessons) {
  if (slugs.has(lesson.slug)) errors.push(`lesson ${lesson.id}: duplicate slug ${lesson.slug}`);
  slugs.add(lesson.slug);

  if (lesson.drillIds.length === 0) errors.push(`lesson ${lesson.id}: no drills`);
  for (const id of lesson.drillIds) {
    if (textById(id) === undefined) errors.push(`lesson ${lesson.id}: unknown drill id ${id}`);
  }
}

if (errors.length > 0) {
  console.error(`Content validation failed with ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

const drillCount = Array.isArray(drills) ? drills.length : 0;
console.log(
  `Content OK: ${total - drillCount} practice texts, ${drillCount} lesson drills, ${lessons.length} lessons.`,
);

if (unreviewed.length > 0) {
  console.log(`${unreviewed.length} item(s) still awaiting a native-speaker review:`);
  console.log(`  ${unreviewed.join(", ")}`);
  if (strict) {
    console.error("Unreviewed content is not allowed in a production build (--strict).");
    process.exit(1);
  }
}
