import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ATTRIBUTION_PATTERNS,
  EXCLUDED_PATHS,
  listTrackedFiles,
  scanText,
  scanTrackedFiles,
} from "./check-attribution.mjs";

// Fixtures are assembled from fragments at runtime and rules are reached through
// the exported table, so this file never spells out the strings it scans for.
// Otherwise the guard would flag its own test suite.
const assemble = (...fragments) => fragments.join("");

const PHRASE_IDS = new Set(
  ATTRIBUTION_PATTERNS.filter((rule) => rule.kind === "phrase").map((rule) => rule.id),
);
const VENDOR_IDS = new Set(
  ATTRIBUTION_PATTERNS.filter((rule) => rule.kind === "vendor").map((rule) => rule.id),
);

const PHRASE_SAMPLES = [
  ["Co-", "Authored", "-By: A Friend <friend@example.com>"],
  ["generated", " with an editor"],
  ["generated", " by a script"],
  ["AI", "-generated", " copy"],
  ["Written", " by ", "AI"],
];

const VENDOR_SAMPLES = [
  ["Ant", "hropic"],
  ["Cla", "ude"],
  ["Open", "AI"],
  ["Chat", "GPT"],
  ["Gem", "ini"],
  ["Copi", "lot"],
  ["Deep", "Seek"],
  ["g", "lm"],
  ["zhi", "pu"],
  ["co", "dex"],
  ["Cursor", " AI"],
];

test("scanText accepts ordinary prose about cursors and carets", () => {
  const prose = [
    "Type Kori — learn to type Bangla. Move the cursor to the next word.",
    "The caret is a 2px accent bar; the text cursor follows the current cluster.",
    ".typing-area { cursor: pointer; }",
    "Commit messages are written by the owner.",
  ].join("\n");

  assert.deepEqual(scanText(prose), []);
});

test("scanText ignores a vendor word embedded in a longer token", () => {
  assert.deepEqual(scanText("claudette and anthropically and copilots"), []);
});

test("scanText finds every attribution phrase fixture", () => {
  for (const fragments of PHRASE_SAMPLES) {
    const findings = scanText(assemble(...fragments));
    assert.ok(findings.length > 0, `no finding for a ${fragments.length}-fragment fixture`);
    assert.ok(
      findings.every((finding) => PHRASE_IDS.has(finding.id)),
      `unexpected rule id: ${findings.map((finding) => finding.id).join(", ")}`,
    );
  }
});

test("scanText finds every vendor name fixture", () => {
  for (const fragments of VENDOR_SAMPLES) {
    const findings = scanText(assemble(...fragments));
    assert.ok(findings.length > 0, `no finding for a ${fragments.length}-fragment fixture`);
    assert.ok(
      findings.every((finding) => VENDOR_IDS.has(finding.id)),
      `unexpected rule id: ${findings.map((finding) => finding.id).join(", ")}`,
    );
  }
});

test("scanText is case-insensitive and matches whole words only", () => {
  const findings = scanText(assemble("cla", "UDE").toUpperCase());
  assert.equal(findings.length, 1);
  assert.equal(findings[0].match.toUpperCase(), assemble("cla", "UDE").toUpperCase());
});

test("scanText reports the line and column of a finding", () => {
  const needle = assemble("Open", "AI");
  const findings = scanText(`first line\nsecond ${needle} line\n`);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 2);
  assert.equal(findings[0].column, "second ".length + 1);
});

test("scanText handles empty and non-string input", () => {
  assert.deepEqual(scanText(""), []);
  assert.deepEqual(scanText(undefined), []);
});

test("rules are unique and well formed", () => {
  const ids = ATTRIBUTION_PATTERNS.map((rule) => rule.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate rule id");

  for (const rule of ATTRIBUTION_PATTERNS) {
    assert.ok(["phrase", "vendor"].includes(rule.kind), `bad kind for ${rule.id}`);
    assert.doesNotThrow(() => new RegExp(rule.source, "gi"), `bad source for ${rule.id}`);
  }

  assert.ok(PHRASE_IDS.size >= 5);
  assert.ok(VENDOR_IDS.size >= 10);
});

test("only the masterplan and this guard are excluded from the file scan", () => {
  assert.deepEqual([...EXCLUDED_PATHS].sort(), ["docs/MASTERPLAN.md", "scripts/check-attribution.mjs"]);
});

test("the repository itself is clean", () => {
  const tracked = listTrackedFiles();

  assert.ok(tracked.includes("README.md"), "expected to see tracked files");
  assert.ok(!tracked.includes("docs/MASTERPLAN.md"), "the masterplan must be excluded");
  assert.deepEqual(scanTrackedFiles(tracked), []);
});

test("the command line interface reports violations and usage errors", () => {
  const script = fileURLToPath(new URL("./check-attribution.mjs", import.meta.url));
  const directory = mkdtempSync(join(tmpdir(), "type-kori-attribution-"));

  try {
    const bad = join(directory, "bad-message.txt");
    writeFileSync(bad, assemble("Cla", "ude", " helped with this change."));
    const rejected = spawnSync(process.execPath, [script, "--message-file", bad], {
      encoding: "utf8",
    });
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /Authorship check failed/);

    const good = join(directory, "good-message.txt");
    writeFileSync(good, "feat: add the comparison engine\n\nThe engine compares clusters.\n");
    const accepted = spawnSync(process.execPath, [script, "--message-file", good], {
      encoding: "utf8",
    });
    assert.equal(accepted.status, 0);

    assert.equal(spawnSync(process.execPath, [script, "--help"], { encoding: "utf8" }).status, 0);
    assert.equal(spawnSync(process.execPath, [script, "--nonsense"], { encoding: "utf8" }).status, 2);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
