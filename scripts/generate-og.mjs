/*
 * Social cards, one per built page.
 *
 * `og:image` used to be the single committed `public/og.png` — a wordless card,
 * which was the right answer while no Bengali font was available to the build.
 * It is available now: `@expo-google-fonts/noto-sans-bengali` ships a real TTF, and
 * `@resvg/resvg-js` takes font *files* directly, so a card can carry the page's
 * own title in either script without relying on whatever fonts the build machine
 * happens to have installed. `public/og.png` stays as the site-wide card.
 *
 * Cards are written into the build output (`dist/og/…`), not into `public/`, so
 * nothing generated is ever committed: the repo holds this script and the font
 * dependency, and every deploy regenerates the cards from the pages it shipped.
 *
 *   node scripts/generate-og.mjs [distDir]     # after a build
 *
 * The pure half (`pageSlug`, `cardTitle`, `wrapTitle`, `cardSvg`) is exported so
 * the tests can hold it still, and so `src/lib/ogCard.ts` — the copy the layout
 * uses to write the meta tags — can be checked against it.
 */

import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, posix } from "node:path";
import { fileURLToPath } from "node:url";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** The palette the committed site-wide card uses (serika dark). */
const BG = "#2c2e31";
const TEXT = "#d1d0c9";
const BRIGHT = "#f0efe7";
const MUTED = "#646669";
const ACCENT = "#e2b714";

/** Where the per-page cards live, relative to the site root. */
export const OG_CARD_DIR = "og";

const TITLE_SUFFIXES = ["| Type Kori", "— Type Kori", "| টাইপ করি"];

/** A page title with the site name taken off, because the card says it already. */
export function cardTitle(title) {
  let out = String(title ?? "").trim();
  for (const suffix of TITLE_SUFFIXES) {
    if (out.endsWith(suffix)) out = out.slice(0, -suffix.length).trim();
  }
  return out;
}

/**
 * The file name a page's card is written to: its path with the language folded
 * in, so `/guide/x` and `/en/guide/x` do not collide.
 */
export function pageSlug(url, lang = "bn") {
  const path = String(url ?? "/").replace(/^\/+|\/+$/g, "");
  const rest = lang === "en" ? (path === "en" ? "" : path.replace(/^en\//, "")) : path;
  const value = rest === "" ? "home" : rest;
  return slugify(lang === "en" ? `en-${value}` : value);
}

function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "page"
  );
}

/** A deterministic hash, so a page's card looks the same on every build. */
function hash(text) {
  let value = 0x811c9dc5;
  for (const character of String(text)) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value >>> 0;
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Break a title into at most `lines` lines of about `maxChars` characters.
 *
 * Deliberately character-based: resvg has no text measuring API, so the honest
 * thing is a conservative width that wraps early rather than an estimate that
 * overflows. A word longer than the limit gets its own line and is clipped by the
 * SVG's width, which is why the limit is generous for Bangla (fewer, wider
 * clusters) than for Latin.
 */
export function wrapTitle(title, maxChars = 26, lines = 2) {
  const words = String(title ?? "").split(/\s+/).filter(Boolean);
  const out = [];
  let current = "";

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if ([...candidate].length <= maxChars || current.length === 0) {
      current = candidate;
      continue;
    }
    out.push(current);
    current = word;
    if (out.length === lines) break;
  }
  if (current.length > 0 && out.length < lines) out.push(current);

  // There is more title than lines: say so with an ellipsis, and drop whole words
  // off the last line until it fits rather than cutting one in half.
  if (out.length === lines && out.join(" ").split(/\s+/).length < words.length) {
    const last = out[lines - 1].split(" ");
    while (last.length > 1 && [...`${last.join(" ")} …`].length > maxChars) last.pop();
    out[lines - 1] = `${last.join(" ")} …`;
  }

  return out.slice(0, lines);
}

/** Two rows of word-blocks, the same visual language as the committed card. */
function signatureBlocks(seed) {
  let state = seed || 1;
  const next = (max) => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state % max;
  };

  let svg = "";
  const block = 18;
  const gap = 6;
  const height = 22;
  const right = OG_WIDTH - 80;

  for (let row = 0; row < 2; row += 1) {
    const y = 470 + row * 44;
    let x = right;
    const words = 3 + next(2);

    for (let index = 0; index < words; index += 1) {
      const letters = 1 + next(4);
      const fill = next(3) === 0 ? ACCENT : next(2) === 0 ? TEXT : MUTED;
      for (let letter = 0; letter < letters; letter += 1) {
        x -= block;
        if (x < OG_WIDTH / 2) break;
        svg += `<rect x="${x}" y="${y}" width="${block}" height="${height}" rx="5" fill="${fill}"/>`;
        x -= gap;
      }
      x -= 14;
      if (x < OG_WIDTH / 2) break;
    }
  }

  return svg;
}

/**
 * The card itself. `lang` picks the script's own metrics: Bangla needs more room
 * above the letters for the matra, and runs a little narrower at the same size.
 */
export function cardSvg({ title, lang = "bn", slug = "page" }) {
  const bangla = lang === "bn";
  const size = bangla ? 58 : 66;
  const leading = bangla ? 84 : 76;
  const maxChars = bangla ? 22 : 27;
  const lines = wrapTitle(cardTitle(title), maxChars, 2);
  const seed = hash(slug);

  const titleSvg = lines
    .map(
      (line, index) =>
        `<text x="80" y="${244 + index * leading}" font-family="Noto Sans Bengali" font-size="${size}" font-weight="700" fill="${BRIGHT}">${escapeXml(line)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${BG}"/>

  <!-- the matra rule: the one unmistakably Bangla stroke -->
  <rect x="80" y="96" width="132" height="8" rx="4" fill="${ACCENT}"/>

  <text x="${OG_WIDTH - 80}" y="112" text-anchor="end" font-family="Noto Sans Bengali" font-size="26" fill="${MUTED}">${bangla ? "বাংলা" : "English"}</text>

  ${titleSvg}

  ${signatureBlocks(seed)}

  <text x="80" y="556" font-family="Noto Sans Bengali" font-size="30" font-weight="700" fill="${ACCENT}">Type Kori</text>
  <text x="80" y="600" font-family="Noto Sans Bengali" font-size="28" fill="${MUTED}">টাইপ করি · typekori</text>
</svg>`;
}

/** The shipped TTF, resolved from this file so a build can never miss it. */
export function fontFile() {
  const here = fileURLToPath(new URL(".", import.meta.url));
  return join(
    here,
    "..",
    "node_modules",
    "@expo-google-fonts",
    "noto-sans-bengali",
    "700Bold",
    "NotoSansBengali_700Bold.ttf",
  );
}

/** Render one card to a PNG buffer. Fails loudly if the font is not installed. */
export async function renderCard({ title, lang, slug }) {
  const font = fontFile();
  if (!existsSync(font)) {
    throw new Error(`no Bengali font at ${font}: run \`bun install\` first`);
  }

  // Imported lazily: the helpers above are pure and cheap, and the tests read
  // them even on a machine where the renderer was never built.
  const { Resvg } = await import("@resvg/resvg-js");
  const resvg = new Resvg(cardSvg({ title, lang, slug }), {
    font: {
      fontFiles: [font],
      loadSystemFonts: false,
      defaultFontFamily: "Noto Sans Bengali",
    },
  });
  return resvg.render().asPng();
}

/** Every `.html` file under a directory, with its URL, language and title. */
export function collectPages(distDir) {
  const pages = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.endsWith(".html")) continue;

      const html = readFileSync(path, "utf8");
      const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "Type Kori";
      const lang = /<html[^>]*\blang="([^"]+)"/.exec(html)?.[1] === "en" ? "en" : "bn";
      const url = `/${relative(distDir, path).split(/[\\/]/).join(posix.sep).replace(/index\.html$/, "")}`;

      pages.push({
        url,
        lang,
        title: title
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"'),
      });
    }
  };

  walk(distDir);
  return pages;
}

/** Write one card per page into `<distDir>/og/`. Returns the paths written. */
export async function generateCards(distDir, { pages } = {}) {
  if (!existsSync(distDir)) throw new Error(`no build output at ${distDir}`);

  const list = pages ?? collectPages(distDir);
  const outDir = join(distDir, OG_CARD_DIR);
  mkdirSync(outDir, { recursive: true });

  const written = [];
  for (const page of list) {
    // The 404 pages are noindex and carry no card; everything else gets one.
    if (page.url.includes("404")) continue;

    const slug = pageSlug(page.url, page.lang);
    const png = await renderCard({ title: page.title, lang: page.lang, slug });
    const file = join(outDir, `${slug}.png`);
    writeFileSync(file, png);
    written.push(file);
  }

  return written;
}

// CLI: only runs when this file is executed, not when it is imported.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const distDir = process.argv[2] ?? "dist";
  const written = await generateCards(distDir);
  console.log(`wrote ${written.length} social cards into ${distDir}/${OG_CARD_DIR}/`);
}
