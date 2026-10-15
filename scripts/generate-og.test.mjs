import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  cardSvg,
  cardTitle,
  collectPages,
  fontFile,
  generateCards,
  pageSlug,
  renderCard,
  wrapTitle,
} from "./generate-og.mjs";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

test("names a card after the page it belongs to", () => {
  assert.equal(pageSlug("/", "bn"), "home");
  assert.equal(pageSlug("/guides/", "bn"), "guides");
  assert.equal(pageSlug("/en/", "en"), "en-home");
  assert.equal(pageSlug("/en/guide/x/", "en"), "en-guide-x");
  assert.equal(pageSlug("/guide/why bangla?", "bn"), "guide-why-bangla");
});

test("takes the site name off a title before drawing it", () => {
  assert.equal(cardTitle("Lessons | Type Kori"), "Lessons");
  assert.equal(cardTitle("FAQ: WPM | Type Kori"), "FAQ: WPM");
  assert.equal(cardTitle("Type Kori"), "Type Kori");
});

test("wraps a long title into at most two lines, and says when it cut one", () => {
  assert.deepEqual(wrapTitle("Short title", 26, 2), ["Short title"]);

  const long = wrapTitle("A very long page title that will not fit on two lines at all", 26, 2);
  assert.equal(long.length, 2);
  assert.ok(long.every((line) => [...line].length <= 26), JSON.stringify(long));
  assert.match(long[1], /…$/);
  // The cut is between words, never through one.
  assert.ok(!long[1].includes("lin…"), JSON.stringify(long));

  // A Bangla title wraps on the same rule, counted in code points.
  const bangla = wrapTitle("বাংলা টাইপিং গাইড ও ফোনেটিক চিটশিট এবং আরও অনেক কিছু", 22, 2);
  assert.equal(bangla.length, 2);
  assert.ok(bangla.every((line) => [...line].length <= 22));
});

test("escapes a title rather than letting it break the SVG", () => {
  const svg = cardSvg({ title: "Typos <like> & \"this\"", lang: "en", slug: "x" });
  assert.ok(svg.includes("Typos &lt;like&gt; &amp; &quot;this&quot;"));
  assert.ok(!svg.includes("<like>"));
});

test("draws the same card for the same page every time", () => {
  const once = cardSvg({ title: "Guides | Type Kori", lang: "bn", slug: "guides" });
  const twice = cardSvg({ title: "Guides | Type Kori", lang: "bn", slug: "guides" });
  assert.equal(once, twice);

  // …and a different one for a different page, so two cards are never the same.
  const other = cardSvg({ title: "Guides | Type Kori", lang: "bn", slug: "faq" });
  assert.notEqual(once, other);
});

test("rasterises text with the font it ships, for both scripts", async () => {
  assert.ok(existsSync(fontFile()), `the Bengali font is not installed at ${fontFile()}`);

  const withBangla = await renderCard({ title: "বাংলা টাইপিং শিখুন", lang: "bn", slug: "probe" });
  const withLatin = await renderCard({ title: "Learn Bangla typing", lang: "en", slug: "probe" });
  const withoutText = await renderCard({ title: "", lang: "bn", slug: "probe" });

  for (const png of [withBangla, withLatin, withoutText]) {
    assert.ok(png.subarray(0, 4).equals(PNG_MAGIC), "not a PNG");
  }

  // The only difference between these renders is the title, so a real difference
  // in size is what proves the glyphs were drawn — a card that silently fell back
  // to no font would be almost exactly the empty one.
  assert.ok(
    withBangla.length > withoutText.length + 2000,
    `Bangla text did not render (${withBangla.length} vs ${withoutText.length} bytes)`,
  );
  assert.ok(withLatin.length > withoutText.length + 2000, "Latin text did not render");
});

test("reads a built page's language and title", () => {
  const dir = mkdtempSync(join(tmpdir(), "og-collect-"));
  try {
    writeFileSync(
      join(dir, "index.html"),
      '<!doctype html><html lang="bn"><head><title>টাইপ করি | Type Kori</title></head></html>',
    );
    mkdirSync(join(dir, "en"));
    writeFileSync(
      join(dir, "en", "index.html"),
      '<!doctype html><html lang="en"><head><title>Type Kori &amp; friends</title></head></html>',
    );

    const pages = collectPages(dir);
    assert.deepEqual(
      pages.map((page) => [page.url, page.lang, page.title]),
      [
        ["/en/", "en", "Type Kori & friends"],
        ["/", "bn", "টাইপ করি | Type Kori"],
      ],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("writes one card per page into the build output, skipping error pages", async () => {
  const dir = mkdtempSync(join(tmpdir(), "og-generate-"));
  try {
    writeFileSync(
      join(dir, "index.html"),
      '<!doctype html><html lang="bn"><head><title>হোম | Type Kori</title></head></html>',
    );
    mkdirSync(join(dir, "guides"));
    writeFileSync(
      join(dir, "guides", "index.html"),
      '<!doctype html><html lang="bn"><head><title>গাইড | Type Kori</title></head></html>',
    );
    mkdirSync(join(dir, "404"));
    writeFileSync(
      join(dir, "404", "index.html"),
      '<!doctype html><html lang="bn"><head><title>পাতা নেই</title></head></html>',
    );

    const written = await generateCards(dir);
    assert.equal(written.length, 2, "the 404 page should carry no card");
    assert.ok(existsSync(join(dir, "og", "home.png")));
    assert.ok(existsSync(join(dir, "og", "guides.png")));
    assert.ok(readFileSync(join(dir, "og", "guides.png")).subarray(0, 4).equals(PNG_MAGIC));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("refuses to invent a card when there is no build to read", async () => {
  await assert.rejects(() => generateCards(join(tmpdir(), "og-does-not-exist")), /no build output/);
});
