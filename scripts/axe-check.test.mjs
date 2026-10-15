import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * The accessibility check is a guard, so the guard itself needs a test: a
 * checker that always exits 0 would look green forever. These cases run the real
 * script against a throwaway `dist/`, asserting it passes a clean page, catches a
 * broken one, and refuses to run without a build.
 */
const SCRIPT = fileURLToPath(new URL("./axe-check.mjs", import.meta.url));

const CLEAN = `<!doctype html><html lang="bn"><head><title>পরীক্ষা</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main><h1>শিরোনাম</h1><p>লেখা</p></main></body></html>`;

/** No lang, an image without alt text and a link with no name. */
const BROKEN = `<!doctype html><html><head><title>t</title></head><body><main><img src="/x.png"><a href="/y"></a></main></body></html>`;

function withDist(files) {
  const dir = mkdtempSync(join(tmpdir(), "axe-check-"));
  mkdirSync(join(dir, "dist"));
  for (const [name, html] of Object.entries(files)) {
    writeFileSync(join(dir, "dist", name), html);
  }
  return dir;
}

function run(dir) {
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  return result;
}

test("passes a page that meets the rules", () => {
  const result = run(withDist({ "index.html": CLEAN }));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /no violations/);
});

test("fails, and names the rule, when a page has a violation", () => {
  const result = run(withDist({ "index.html": BROKEN }));
  assert.equal(result.status, 1);
  assert.match(result.stdout, /image-alt/);
  assert.match(result.stderr, /violation/);
});

test("checks every page, not just the first", () => {
  const result = run(withDist({ "index.html": CLEAN, "other.html": BROKEN }));
  assert.equal(result.status, 1);
  assert.match(result.stdout, /other\.html/);
});

test("refuses to run without a build", () => {
  const dir = mkdtempSync(join(tmpdir(), "axe-check-empty-"));
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /bun run build/);
});
