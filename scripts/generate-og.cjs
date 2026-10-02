/*
 * One-time generator for `public/og.png` — the 1200x630 social card used by
 * the og:image and twitter:image meta tags in BaseLayout.astro.
 *
 * Font-free by design: the card is pure geometry that evokes the typing
 * block — typed words, dim pending words, the gliding caret and the matra
 * rule, on the serika-dark palette. Run it where sharp is installed:
 *
 *   npm install sharp && node scripts/generate-og.cjs
 *
 * (or `NODE_PATH=<sharp's node_modules> node scripts/generate-og.cjs`).
 * sharp is deliberately not a project dependency: the card is committed, and
 * this only needs to run again if the design changes.
 */

const sharp = require("sharp");

const W = 1200;
const H = 630;
const BG = "#2c2e31";
const TEXT = "#d1d0c9";
const MUTED = "#646669";
const ACCENT = "#e2b714";

/** A word = 1-3 rounded blocks (letters) with a word gap after it. */
function word(x, y, letters, fill, opacity = 1) {
  const block = 26;
  const gap = 6;
  let rects = "";
  for (let i = 0; i < letters; i += 1) {
    rects += `<rect x="${x + i * (block + gap)}" y="${y}" width="${block}" height="34" rx="7" fill="${fill}" opacity="${opacity}"/>`;
  }
  return { svg: rects, nextX: x + letters * (block + gap) + 22 };
}

function wordLine(y, spec) {
  let x = 90;
  let out = "";
  for (const item of spec) {
    const w = word(x, y, item[0], item[1], item[2]);
    out += w.svg;
    x = w.nextX;
  }
  return out;
}

// The caret sits inside the highlighted word on line 2.
const activeWordStart = 90 + 1 * 48 + 3 * 48 + 2 * 22;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- the matra rule, the one unmistakably Bangla stroke -->
  <rect x="90" y="120" width="132" height="8" rx="4" fill="${ACCENT}"/>

  <!-- line 1: fully typed (light) -->
  ${wordLine(200, [
    [3, TEXT], [1, TEXT], [2, TEXT], [1, TEXT], [2, TEXT],
  ])}

  <!-- line 2: typed, then the active word, then the gliding caret -->
  ${wordLine(300, [
    [1, TEXT], [3, TEXT], [4, MUTED], [2, MUTED], [1, MUTED],
  ])}
  <rect x="${activeWordStart + 4 * 48 - 22}" y="292" width="4" height="50" rx="2" fill="${ACCENT}"/>

  <!-- line 3: pending -->
  ${wordLine(400, [
    [2, MUTED], [1, MUTED], [3, MUTED], [1, MUTED], [2, MUTED], [1, MUTED],
  ])}
</svg>
`;

sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(__dirname + "/../public/og.png")
  .then(() => console.log("public/og.png written"));
