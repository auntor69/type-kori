#!/usr/bin/env node
/**
 * Authorship guard.
 *
 * Fails if an attribution pattern appears in the tracked files or in any commit
 * message. The project's history and source must show the owner as the only
 * author, so this runs both as a local commit-msg hook and in CI.
 *
 * Usage:
 *   node scripts/check-attribution.mjs                     # every tracked file, all commits
 *   node scripts/check-attribution.mjs --range A..B        # commit messages in a range
 *   node scripts/check-attribution.mjs --message-file FILE # one commit message (hook)
 *   node scripts/check-attribution.mjs --files-only
 *
 * Exits 0 when clean, 1 when a violation is found, 2 on a usage/IO error.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";

/**
 * Files that are allowed to contain the patterns as data: this script defines
 * them, and the masterplan quotes them while describing this very rule.
 */
export const EXCLUDED_PATHS = new Set([
  "docs/MASTERPLAN.md",
  "scripts/check-attribution.mjs",
]);

/**
 * Attribution patterns, matched case-insensitively on word boundaries.
 *
 * Tuned for false positives: the bare word "cursor" is deliberately absent, so
 * "move the cursor" and `cursor: pointer` stay legal. It only matches in an
 * attribution-like context.
 */
export const ATTRIBUTION_PATTERNS = [
  // Attribution phrases. Never legitimate in this project.
  { kind: "phrase", id: "co-authored-by", source: String.raw`\bco[\s_-]?authored[\s_-]?by\b` },
  { kind: "phrase", id: "generated-with", source: String.raw`\bgenerated\s+with\b` },
  { kind: "phrase", id: "generated-by", source: String.raw`\bgenerated\s+by\b` },
  { kind: "phrase", id: "ai-generated", source: String.raw`\bai[\s_-]generated\b` },
  {
    kind: "phrase",
    id: "written-by-ai",
    source: String.raw`\bwritten\s+by\s+(?:ai|an?\s+(?:ai|llm|model))\b`,
  },
  // Vendor and model names.
  { kind: "vendor", id: "anthropic", source: String.raw`\banthropic\b` },
  { kind: "vendor", id: "claude", source: String.raw`\bclaude\b` },
  { kind: "vendor", id: "openai", source: String.raw`\bopen[\s-]?ai\b` },
  { kind: "vendor", id: "chatgpt", source: String.raw`\bchat[\s-]?gpt\b` },
  { kind: "vendor", id: "gpt", source: String.raw`\bgpt(?:-?\d+(?:\.\d+)?)?\b` },
  { kind: "vendor", id: "gemini", source: String.raw`\bgemini\b` },
  { kind: "vendor", id: "copilot", source: String.raw`\bcopilot\b` },
  { kind: "vendor", id: "deepseek", source: String.raw`\bdeep[\s-]?seek\b` },
  { kind: "vendor", id: "glm", source: String.raw`\bglm\b` },
  { kind: "vendor", id: "zhipu", source: String.raw`\bzhipu\b` },
  { kind: "vendor", id: "codex", source: String.raw`\bcodex\b` },
  {
    kind: "vendor",
    id: "cursor-ai",
    source: String.raw`\bcursor\s*(?:\.ai\b|\bai\b|\bide\b|\bemail\b)`,
  },
];

export const COMPILED_PATTERNS = ATTRIBUTION_PATTERNS.map((pattern) => ({
  ...pattern,
  regex: new RegExp(pattern.source, "gi"),
}));

/** The largest excerpt we quote back in a report, to keep the output readable. */
const EXCERPT_RADIUS = 42;

/**
 * Find every attribution pattern in a piece of text.
 * @param {string} text
 * @returns {{ id: string, match: string, index: number, line: number, column: number, excerpt: string }[]}
 */
export function scanText(text) {
  const found = [];
  if (typeof text !== "string" || text.length === 0) return found;

  for (const { id, regex } of COMPILED_PATTERNS) {
    regex.lastIndex = 0;
    let hit;
    while ((hit = regex.exec(text)) !== null) {
      // Guard against a zero-length match looping forever.
      if (hit[0].length === 0) {
        regex.lastIndex += 1;
        continue;
      }
      const before = text.slice(0, hit.index);
      const line = before.split("\n").length;
      const column = hit.index - (before.lastIndexOf("\n") + 1) + 1;
      found.push({
        id,
        match: hit[0],
        index: hit.index,
        line,
        column,
        excerpt: excerpt(text, hit.index, hit.index + hit[0].length),
      });
    }
  }

  return found.sort((a, b) => a.index - b.index);
}

function excerpt(text, start, end) {
  const from = Math.max(0, start - EXCERPT_RADIUS);
  const to = Math.min(text.length, end + EXCERPT_RADIUS);
  const head = from > 0 ? "…" : "";
  const tail = to < text.length ? "…" : "";
  return `${head}${text.slice(from, to).replace(/\s+/g, " ").trim()}${tail}`;
}

function isProbablyBinary(buffer) {
  const window = buffer.subarray(0, 8000);
  return window.includes(0);
}

/** Run a git command, returning stdout, or "" when git is unavailable. */
function git(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (error && error.status === 128) return "";
    throw error;
  }
}

/** Every tracked file, newest listing first, excluding the allow-listed paths. */
export function listTrackedFiles() {
  return git(["ls-files", "-z"])
    .split("\0")
    .filter(Boolean)
    .filter((path) => !EXCLUDED_PATHS.has(path));
}

/** Scan tracked files. Returns one violation per file with findings. */
export function scanTrackedFiles(files = listTrackedFiles()) {
  const violations = [];
  for (const path of files) {
    let buffer;
    try {
      buffer = readFileSync(path);
    } catch {
      continue; // Deleted between listing and reading.
    }
    if (isProbablyBinary(buffer)) continue;
    const findings = scanText(buffer.toString("utf8"));
    if (findings.length > 0) violations.push({ path, findings });
  }
  return violations;
}

/**
 * Commit messages to scan.
 * @param {string | null} range a git revision range, or null for every ref
 * @returns {{ hash: string, message: string }[]}
 */
export function listCommitMessages(range = null) {
  const args = ["log", "--format=%H%x00%B%x00%x00"];
  if (range) args.push(range);
  else args.push("--all");

  return git(args)
    .split("\0\0")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const separator = chunk.indexOf("\0");
      return {
        hash: chunk.slice(0, separator).trim(),
        message: chunk.slice(separator + 1),
      };
    });
}

/** Scan commit messages. Returns one violation per offending commit. */
export function scanCommits(range = null) {
  const violations = [];
  for (const { hash, message } of listCommitMessages(range)) {
    const findings = scanText(message);
    if (findings.length > 0) violations.push({ path: `commit ${hash.slice(0, 10)}`, findings });
  }
  return violations;
}

function report(violations) {
  const lines = [
    "Authorship check failed. The only author of this project is the repository owner:",
    "no attribution, co-author trailer, vendor or model name may appear in a tracked",
    "file or a commit message.",
    "",
  ];

  for (const violation of violations) {
    lines.push(`  ${violation.path}`);
    for (const finding of violation.findings) {
      const where = violation.path.startsWith("commit ")
        ? "commit message"
        : `${finding.line}:${finding.column}`;
      lines.push(`    [${finding.id}] at ${where} — "${finding.excerpt}"`);
    }
  }

  lines.push("", "Fix the text (or amend the message) and run the check again.");
  return lines.join("\n");
}

export function run(argv = process.argv.slice(2)) {
  let range = null;
  let messageFile = null;
  let filesOnly = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--range") range = argv[(i += 1)];
    else if (arg === "--message-file") messageFile = argv[(i += 1)];
    else if (arg === "--files-only") filesOnly = true;
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "Usage: node scripts/check-attribution.mjs [--range A..B] [--message-file FILE] [--files-only]\n",
      );
      return 0;
    } else {
      process.stderr.write(`Unknown argument: ${arg}\n`);
      return 2;
    }
  }

  if (messageFile) {
    const findings = scanText(readFileSync(messageFile, "utf8"));
    if (findings.length > 0) {
      process.stderr.write(`${report([{ path: messageFile, findings }])}\n`);
      return 1;
    }
    return 0;
  }

  const violations = [
    ...scanTrackedFiles(),
    ...(filesOnly ? [] : scanCommits(range)),
  ];

  if (violations.length > 0) {
    process.stderr.write(`${report(violations)}\n`);
    return 1;
  }

  process.stdout.write("Authorship check passed: no attribution patterns found.\n");
  return 0;
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  try {
    process.exitCode = run();
  } catch (error) {
    process.stderr.write(`Authorship check could not run: ${error?.message ?? error}\n`);
    process.exitCode = 2;
  }
}
