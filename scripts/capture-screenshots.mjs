/*
 * README screenshots, captured from a running site:
 *
 *   PLAYWRIGHT_NODE_MODULES=/path/to/playwright node scripts/capture-screenshots.mjs https://typekori.vercel.app
 *
 * Needs playwright resolvable (see PLAYWRIGHT_NODE_MODULES) and its chromium
 * installed. Writes 1440x900 @2x dark-mode shots into docs/assets/.
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(process.env.PLAYWRIGHT_NODE_MODULES ?? import.meta.url);
const { chromium } = require("playwright");

const base = process.argv[2] ?? "http://127.0.0.1:4321";
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "assets");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});

// The practice page, idle: the words are the UI.
await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
await page.screenshot({ path: join(outDir, "practice.png") });
console.log("captured practice.png");

// The lesson path.
await page.goto(`${base}/lessons`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
await page.screenshot({ path: join(outDir, "lessons.png") });
console.log("captured lessons.png");

await browser.close();
console.log("done → docs/assets/");
