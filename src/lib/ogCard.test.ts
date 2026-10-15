/**
 * The card paths are computed twice: here (for the `og:image` meta tag) and in
 * `scripts/generate-og.mjs` (for the file). The point of this file is the last
 * describe block: it runs both rules over the same pages and fails if they ever
 * disagree, which would otherwise show up as a broken image on every shared link.
 */

import { describe, expect, it } from "vitest";

import { cardTitle, pageSlug as scriptPageSlug } from "../../scripts/generate-og.mjs";
import { localizePath, type Lang } from "../i18n";
import { OG_CARD_DIRECTORY, SITE_SOCIAL_IMAGE, ogCardPath, ogCardSlug, socialCardTitle } from "./ogCard";

const PAGES = [
  "/",
  "/lessons",
  "/lesson/vowels",
  "/guides",
  "/guide/how-to-type-bangla",
  "/keyboard",
  "/game",
  "/faq",
  "/about",
  "/progress",
  "/privacy",
];

describe("a page's card path", () => {
  it("names the homepage and every other page after its own path", () => {
    expect(ogCardPath("/", "bn")).toBe(`/${OG_CARD_DIRECTORY}/home.png`);
    expect(ogCardPath("/guides", "bn")).toBe(`/${OG_CARD_DIRECTORY}/guides.png`);
    expect(ogCardPath("/guide/how-to-type-bangla", "bn")).toBe(
      `/${OG_CARD_DIRECTORY}/guide-how-to-type-bangla.png`,
    );
  });

  it("keeps the two editions of a page apart", () => {
    for (const path of PAGES) {
      expect(ogCardSlug(path, "bn")).not.toBe(ogCardSlug(path, "en"));
    }
    expect(ogCardSlug("/", "en")).toBe("en-home");
    expect(ogCardSlug("/guides", "en")).toBe("en-guides");
  });

  it("copies with or without the language prefix and with or without slashes", () => {
    // The layout passes a site-root-relative path, but the same page is also
    // reachable with the `/en` prefix and a trailing slash; all of them must name
    // the same file, or one visit would write a second card.
    expect(ogCardSlug("/en/guides/", "en")).toBe("en-guides");
    expect(ogCardSlug("guides", "bn")).toBe("guides");
    expect(ogCardSlug("/guides/", "bn")).toBe("guides");
  });

  it("keeps the site-wide card available as the fallback", () => {
    expect(SITE_SOCIAL_IMAGE).toBe("/og.png");
    expect(ogCardPath("/guides", "bn")).not.toBe(SITE_SOCIAL_IMAGE);
  });

  it("strips a file name out of anything that is not a letter or a digit", () => {
    expect(ogCardSlug("/guide/why bangla?", "bn")).toBe("guide-why-bangla");
    expect(ogCardSlug("/2026/10", "bn")).toBe("2026-10");
  });
});

describe("the title written on a card", () => {
  it("drops the site name, because the card carries the wordmark", () => {
    expect(socialCardTitle("Lessons | Type Kori")).toBe("Lessons");
    expect(socialCardTitle("বাংলা টাইপিং গাইড | Type Kori")).toBe("বাংলা টাইপিং গাইড");
    expect(socialCardTitle("Type Kori")).toBe("Type Kori");
  });

  it("agrees with the generator", () => {
    for (const title of [
      "Lessons | Type Kori",
      "বাংলা টাইপিং গাইড | Type Kori",
      "FAQ: WPM, accuracy and your data | Type Kori",
      "Type Kori",
      "  spaced out  ",
    ]) {
      expect(socialCardTitle(title), title).toBe(cardTitle(title));
    }
  });
});

describe("the layout's rule and the generator's rule", () => {
  it("produce the same file name for every page in both languages", () => {
    for (const lang of ["bn", "en"] as Lang[]) {
      for (const path of PAGES) {
        // The generator reads a built page's URL, which carries the /en prefix.
        const url = localizePath(path, lang);
        expect(ogCardSlug(path, lang), `${lang} ${path}`).toBe(scriptPageSlug(url, lang));
      }
    }
  });

  it("produce the same file name for the built URL shapes too", () => {
    // collectPages() hands the generator URLs with a trailing slash once a page
    // has been built to `…/index.html`.
    expect(scriptPageSlug("/guides/", "bn")).toBe(ogCardSlug("/guides", "bn"));
    expect(scriptPageSlug("/en/", "en")).toBe(ogCardSlug("/", "en"));
    expect(scriptPageSlug("/en/guide/x/", "en")).toBe(ogCardSlug("/guide/x", "en"));
  });
});
