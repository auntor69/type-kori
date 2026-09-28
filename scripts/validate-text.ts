/**
 * Content validator.
 *
 * Fails when a practice text contains characters outside the Bengali block, has
 * broken metadata, or is a duplicate. Texts that have not been reviewed by a
 * native speaker are listed as a warning, and fail only with `--strict`, which
 * becomes the production setting once the review pass is complete
 * (docs/VERIFY.md).
 *
 * Run with: bun run validate:text
 */

import easy from "../content/texts/easy.json";
import hard from "../content/texts/hard.json";
import medium from "../content/texts/medium.json";
import { validateTextSet } from "../src/engine/text/provider";

const sets: Record<string, unknown> = { easy, medium, hard };
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

if (errors.length > 0) {
  console.error(`Content validation failed with ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(`Content OK: ${total} texts across ${Object.keys(sets).length} sets.`);

if (unreviewed.length > 0) {
  console.log(`${unreviewed.length} text(s) still awaiting a native-speaker review:`);
  console.log(`  ${unreviewed.join(", ")}`);
  if (strict) {
    console.error("Unreviewed content is not allowed in a production build (--strict).");
    process.exit(1);
  }
}
