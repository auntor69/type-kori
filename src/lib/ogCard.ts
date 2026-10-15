/**
 * Which social card belongs to which page.
 *
 * Until the per-page cards existed there was exactly one image (`/og.png`), so the
 * layout had nothing to decide. Now every built page gets its own card with the
 * page's own title on it, and the name of that file has to be computed in two
 * places: here, where the layout writes the `og:image` meta tag, and in
 * `scripts/generate-og.mjs`, which writes the file. One of them is TypeScript the
 * site builds with and the other is a Node script, so they cannot share a module —
 * they share `src/lib/ogCard.test.ts` instead, which runs both over the same list
 * of pages and fails if the two rules ever drift apart.
 *
 * The rule: the page's path, language folded in, everything that is not a letter
 * or a digit turned into a dash. Bangla lives at the root, so `/` is `home` and
 * every English page is prefixed `en-`.
 */

import type { Lang } from "../i18n";

/** The directory the generator writes into, inside the build output. */
export const OG_CARD_DIRECTORY = "og";

/**
 * The site-wide card. It is committed (`public/og.png`) and stays as the image
 * named by structured data and by any page that is not built by the generator,
 * so a missing per-page file degrades to a real image rather than a broken one.
 */
export const SITE_SOCIAL_IMAGE = "/og.png";

/** Drop the site name from a title: the card already carries the wordmark. */
export function socialCardTitle(title: string): string {
  let out = title.trim();
  for (const suffix of ["| Type Kori", "— Type Kori", "| টাইপ করি"]) {
    if (out.endsWith(suffix)) out = out.slice(0, -suffix.length).trim();
  }
  return out;
}

/** The file name (without extension) one page's card is written to. */
export function ogCardSlug(path: string, lang: Lang): string {
  const withoutSlashes = path.replace(/^\/+|\/+$/g, "");
  const withoutLanguage =
    lang === "en" ? (withoutSlashes === "en" ? "" : withoutSlashes.replace(/^en\//, "")) : withoutSlashes;
  const value = withoutLanguage === "" ? "home" : withoutLanguage;

  return slugify(lang === "en" ? `en-${value}` : value);
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "page"
  );
}

/** The site-root-relative URL of a page's card, for the meta tags. */
export function ogCardPath(path: string, lang: Lang): string {
  return `/${OG_CARD_DIRECTORY}/${ogCardSlug(path, lang)}.png`;
}
