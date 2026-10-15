#!/usr/bin/env node
/**
 * Accessibility check.
 *
 * Runs axe-core over every page in `dist`, in a jsdom window, and fails when a
 * page has a violation. Sections 11 and 13 of docs/MASTERPLAN.md require the
 * accessibility rules to be hard acceptance criteria rather than good
 * intentions, so this runs in CI after the build.
 *
 *   node scripts/axe-check.mjs            # check every built page
 *   node scripts/axe-check.mjs --verbose  # list every violation, not just the first
 *
 * Exit codes: 0 clean, 1 violations, 2 usage/IO error.
 *
 * Colour contrast is switched off here on purpose: axe cannot compute it without
 * a real layout engine, so it reports `incomplete`. Contrast is enforced instead
 * by `src/lib/colors.test.ts`, which checks every theme's token pairs directly.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

import { JSDOM, VirtualConsole } from "jsdom";
import axe from "axe-core";

const DIST = "dist";
const VERBOSE = process.argv.includes("--verbose");

/** Every `.html` file under a directory, sorted for a stable report. */
function htmlFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...htmlFiles(path));
    else if (entry.endsWith(".html")) found.push(path);
  }
  return found;
}

/** One line per node, with the rule and what to fix. */
function describe(violation) {
  return violation.nodes.map((node) => {
    const target = Array.isArray(node.target) ? node.target.join(" ") : String(node.target);
    return `      ${target} — ${node.failureSummary ?? ""}`.trimEnd();
  });
}

async function main() {
  if (!existsSync(DIST)) {
    console.error(`No ${DIST}/ directory. Run \`bun run build\` first.`);
    process.exit(2);
  }

  const files = htmlFiles(DIST);
  if (files.length === 0) {
    console.error(`No HTML found under ${DIST}/. Run \`bun run build\` first.`);
    process.exit(2);
  }

  const options = {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false } },
  };

  let failing = 0;
  let totalViolations = 0;

  for (const file of files) {
    const html = readFileSync(file, "utf8");
    // `runScripts: "outside-only"` gives the window an `eval` to run axe in; the
    // page's own scripts are still never executed, which is what we want for a
    // static HTML scan.
    // jsdom has no canvas and no layout engine, so it reports "not implemented"
    // for both. Those are jsdom's limitations, not page defects; the virtual
    // console drops them so a real violation is not buried in noise.
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", () => undefined);

    const dom = new JSDOM(html, {
      runScripts: "outside-only",
      pretendToBeVisual: true,
      url: "https://typekori.vercel.app/",
      virtualConsole,
    });
    const { window } = dom;

    // axe expects to run inside the page's own window.
    window.eval(axe.source);
    const results = await window.axe.run(window.document, options);

    if (results.violations.length === 0) continue;

    failing += 1;
    totalViolations += results.violations.length;
    const shown = VERBOSE ? results.violations : results.violations.slice(0, 3);

    console.log(`\n✗ ${relative(DIST, file)}`);
    for (const violation of shown) {
      console.log(`    ${violation.id} (${violation.impact ?? "unknown"}) — ${violation.help}`);
      for (const line of describe(violation)) console.log(line);
    }
    if (!VERBOSE && results.violations.length > shown.length) {
      console.log(`    …and ${results.violations.length - shown.length} more (use --verbose)`);
    }
  }

  if (failing > 0) {
    console.error(`\n${totalViolations} accessibility violation(s) across ${failing} page(s).`);
    process.exit(1);
  }

  console.log(`✓ axe: ${files.length} pages checked, no violations.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
