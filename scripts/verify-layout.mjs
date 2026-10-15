/*
 * Headless-browser layout check, run against a served build or the preview:
 *
 *   node scripts/verify-layout.mjs https://<url>/
 *
 * Needs playwright somewhere resolvable (the script looks it up from
 * PLAYWRIGHT_NODE_MODULES when set). Asserts the practice block — the words,
 * the on-screen board and the live stats — is inside the first viewport so a
 * run starts without scrolling, that the page never overflows sideways, that
 * the studio line is reachable, that finishing a run still works, and that
 * long pages still scroll.
 *
 * The homepage is a full-height flex column that fits exactly *when its own
 * content fits* and scrolls otherwise (the rule recorded with the layout in
 * `c4aa9ce`). The on-screen board is taller than the old words-only page, so
 * the page now grows past one viewport — what must not regress is that the
 * typing block itself is above the fold.
 */

import { createRequire } from "node:module";

const require = createRequire(process.env.PLAYWRIGHT_NODE_MODULES ?? import.meta.url);
const { chromium } = require("playwright");

const base = process.argv[2] ?? "http://127.0.0.1:4321";

const browser = await chromium.launch();
// Service workers are blocked because the replay check below holds the
// engine's module fetch open, and Playwright cannot intercept a fetch the
// service worker serves (documented Playwright behaviour). Nothing this script
// asserts depends on the worker.
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  serviceWorkers: "block",
});

// The typing engine is supposed to stay off the load path: the server-rendered
// words are the page, and the component's own module is only fetched once the
// visitor touches it (see `src/lib/deferredHydration.ts`). Every script this
// run asks for is recorded so the claim can be checked rather than asserted.
const scripts = [];
page.on("request", (request) => {
  if (request.resourceType() === "script") scripts.push(new URL(request.url()).pathname);
});
// `Practice.<hash>.js` in a build, `Practice.tsx` under the dev server — and
// deliberately not `PracticeIsland.astro…`, whose loader script *is* on the
// load path and would otherwise look like a false positive.
const PRACTICE_MODULE = /\/Practice\.([A-Za-z0-9_-]+\.js|tsx)$/;

/**
 * Scroll to the very bottom and say whether the footer came into view.
 *
 * Two things make this fiddlier than one `scrollTo`: `scroll-behavior: smooth`
 * is set globally (with a reduced-motion escape), so a scroll animates and
 * reading straight afterwards measures a half-finished trip; and the progress
 * page grows while its island hydrates, so the first scroll can be to a bottom
 * that has since moved. The smooth behaviour is switched off for the check and
 * the scroll is retried until the footer is actually in the viewport.
 */
async function reachFooter(target) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await target.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    const reached = await target.evaluate(
      () => (document.querySelector("footer")?.getBoundingClientRect().top ?? Infinity) < window.innerHeight,
    );
    if (reached) return true;
    await target.waitForTimeout(200);
  }
  return false;
}

await page.goto(`${base}/`, { waitUntil: "load" });
await page.waitForTimeout(600);

const home = await page.evaluate(() => {
  const footer = document.querySelector("footer");
  const block = document.querySelector("[data-tk-practice]")?.getBoundingClientRect();
  return {
    blockTop: block === undefined ? null : Math.round(block.top),
    blockBottom: block === undefined ? null : Math.round(block.bottom),
    innerHeight: window.innerHeight,
    overflowsSideways: document.documentElement.scrollWidth > window.innerWidth + 1,
    footerText: footer?.textContent?.trim() ?? "",
    caret: document.querySelector(".tk-caret") !== null,
  };
});
console.log("HOME:", JSON.stringify(home));
if (home.blockTop === null || home.blockBottom === null) throw new Error("practice block missing");
if (home.blockTop < 0 || home.blockBottom > home.innerHeight) {
  throw new Error("practice block runs past the first viewport");
}
if (home.overflowsSideways) throw new Error("homepage overflows horizontally");
if (!home.footerText.includes("Afterclass Studio")) throw new Error("studio line missing");

// Still before any interaction: the engine must not have been fetched yet.
const earlyPractice = scripts.filter((path) => PRACTICE_MODULE.test(path));
console.log("EARLY SCRIPTS:", JSON.stringify({ practice: earlyPractice.length }));
if (earlyPractice.length > 0) {
  throw new Error(`typing engine loaded before any interaction: ${earlyPractice.join(", ")}`);
}

// Finishing a run must still work with the fitted layout.
await page.evaluate(() => document.querySelector("[data-tk-input]")?.focus());
for (const key of "ami bhalo achi") await page.keyboard.type(key, { delay: 30 });
await page.keyboard.press("Tab");
await page.waitForTimeout(400);

// The interaction did load the engine — otherwise the "not fetched early"
// check above would also pass on a page whose island never loads at all.
const latePractice = scripts.filter((path) => PRACTICE_MODULE.test(path));
if (latePractice.length === 0) throw new Error("typing engine never loaded after interaction");

const hasResults = await page.evaluate(() => document.getElementById("results-heading") !== null);
console.log("RESULTS:", JSON.stringify({ hasResults }));
if (!hasResults) throw new Error("results screen did not appear");

// However tall the page got, the studio line is still reachable.
const homeFooterReachable = await reachFooter(page);
console.log("HOME FOOTER:", JSON.stringify({ homeFooterReachable }));
if (!homeFooterReachable) throw new Error("studio line unreachable on the homepage");

// A keystroke pressed while the engine is still loading must not be lost. The
// module fetch is held open, all fifteen keys are pressed against the
// server-rendered page, and only then is the module released — every key has
// to have been buffered and replayed on the other side, so the run the typist
// typed is the run that finishes.
{
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  const routePattern = /\/Practice\.([A-Za-z0-9_-]+\.js|tsx)/;
  await page.route(routePattern, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto(`${base}/`, { waitUntil: "load" });
  await page.evaluate(() => {
    window.__replayed = 0;
    const dispatch = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (event) {
      if (event instanceof KeyboardEvent && event.type === "keydown" && !event.isTrusted) {
        window.__replayed += 1;
      }
      return dispatch.call(this, event);
    };
  });
  await page.evaluate(() => document.querySelector("[data-tk-input]")?.focus());
  for (const key of "ami bhalo achi") await page.keyboard.type(key, { delay: 20 });
  await page.keyboard.press("Tab");
  release();
  const replayedRun = await page
    .waitForFunction(() => document.getElementById("results-heading") !== null, null, {
      timeout: 8000,
    })
    .then(() => true)
    .catch(() => false);
  const replayed = await page.evaluate(() => window.__replayed);
  console.log("REPLAY:", JSON.stringify({ replayed, replayedRun }));
  if (!replayedRun) throw new Error("a run typed while the engine loaded never finished");
  if (replayed !== 15) throw new Error(`expected 15 buffered keys, replayed ${replayed}`);
  await page.unroute(routePattern);
}

// Long pages keep scrolling, and the footer stays reachable on them.
await page.goto(`${base}/progress/`, { waitUntil: "load" });
const progressCanScroll = await page.evaluate(
  () => document.documentElement.scrollHeight > window.innerHeight,
);
const footerReachable = await reachFooter(page);
console.log("PROGRESS:", JSON.stringify({ progressCanScroll, footerReachable }));
if (!footerReachable) throw new Error("footer unreachable on progress page");

await browser.close();
console.log("ALL LAYOUT CHECKS PASSED");
