/*
 * Headless-browser layout check, run against a served build or the preview:
 *
 *   node scripts/verify-layout.mjs https://<url>/
 *
 * Needs playwright somewhere resolvable (the script looks it up from
 * PLAYWRIGHT_NODE_MODULES when set). Asserts the homepage fits one viewport
 * with the studio line visible, that finishing a run still works, and that
 * the footer is reachable on long pages.
 */

import { createRequire } from "node:module";

const require = createRequire(process.env.PLAYWRIGHT_NODE_MODULES ?? import.meta.url);
const { chromium } = require("playwright");

const base = process.argv[2] ?? "http://127.0.0.1:4321";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

await page.goto(`${base}/`, { waitUntil: "load" });
await page.waitForTimeout(600);

const home = await page.evaluate(() => {
  const footer = document.querySelector("footer");
  const rect = footer?.getBoundingClientRect();
  return {
    canScroll: document.documentElement.scrollHeight > window.innerHeight,
    footerVisible: rect !== undefined && rect.bottom <= window.innerHeight + 1,
    footerText: footer?.textContent?.trim() ?? "",
    caret: document.querySelector(".tk-caret") !== null,
  };
});
console.log("HOME:", JSON.stringify(home));
if (home.canScroll) throw new Error("homepage scrolls: it should fit the viewport");
if (!home.footerVisible) throw new Error("studio line is below the fold");
if (!home.footerText.includes("Afterclass Studio")) throw new Error("studio line missing");

// Finishing a run must still work with the fitted layout.
await page.evaluate(() => document.querySelector("[data-tk-input]")?.focus());
for (const key of "ami bhalo achi") await page.keyboard.type(key, { delay: 30 });
await page.keyboard.press("Tab");
await page.waitForTimeout(400);
const hasResults = await page.evaluate(() => document.getElementById("results-heading") !== null);
console.log("RESULTS:", JSON.stringify({ hasResults }));
if (!hasResults) throw new Error("results screen did not appear");

// Long pages keep scrolling, and the footer stays reachable on them.
await page.goto(`${base}/progress/`, { waitUntil: "load" });
const progressCanScroll = await page.evaluate(
  () => document.documentElement.scrollHeight > window.innerHeight,
);
await page.keyboard.press("End");
const footerReachable = await page.evaluate(() => {
  const rect = document.querySelector("footer")?.getBoundingClientRect();
  return rect !== undefined && rect.top < window.innerHeight;
});
console.log("PROGRESS:", JSON.stringify({ progressCanScroll, footerReachable }));
if (!footerReachable) throw new Error("footer unreachable on progress page");

await browser.close();
console.log("ALL LAYOUT CHECKS PASSED");
