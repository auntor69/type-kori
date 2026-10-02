/**
 * The SEO contract. Crawlers read the built HTML, but the facts are decided
 * in the layout and the page sources — so the tests read those and pin the
 * things that must never silently disappear: the canonical/hreflang pair,
 * the social card, the structured data naming the studio, and the crawl
 * files.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

const layout = read("src/layouts/BaseLayout.astro");
const robots = read("public/robots.txt");
const astroConfig = read("astro.config.mjs");

describe("the social card", () => {
  it("points og:image and twitter:image at a real 1200x630 card", () => {
    expect(layout).toContain('absolute("/og.png")');
    expect(layout).toContain('property="og:image:width" content="1200"');
    expect(layout).toContain('property="og:image:height" content="630"');
    expect(() => read("public/og.png")).not.toThrow();
    // PNG magic, not an accidental text file.
    const png = readFileSync(`${root}/public/og.png`);
    expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it("uses the large card on Twitter", () => {
    expect(layout).toContain('content="summary_large_image"');
  });
});

describe("the structured data", () => {
  it("lives per page, not twice on the homepage", () => {
    // The layout must not emit a second WebApplication record next to the
    // homepage's own (two records for one app is noise to crawlers).
    expect(layout).not.toContain('"WebApplication"');
    for (const page of ["src/pages/index.astro", "src/pages/en/index.astro"]) {
      expect(read(page), page).toContain('"@type": "WebApplication"');
    }
    // Lesson and lessons-list pages keep their own schemas.
    expect(read("src/pages/lessons.astro")).toContain("ld+json");
    expect(read("src/pages/lessons/[slug].astro")).toContain("ld+json");
  });

  it("names Afterclass Studio as author and publisher of the app", () => {
    for (const page of ["src/pages/index.astro", "src/pages/en/index.astro"]) {
      const schema = read(page);
      expect(schema, page).toContain('"Afterclass Studio"');
      expect(schema, page).toContain("publisher");
      expect(schema, page).toContain("/og.png");
    }
    // One constant feeds the author meta and the footer.
    expect(layout).toContain('const STUDIO = "Afterclass Studio"');
    expect(layout).toContain('content={STUDIO}');
  });
});

describe("the crawl files", () => {
  it("robots.txt points at the sitemap the build produces", () => {
    const site = /site:\s*"([^"]+)"/.exec(astroConfig)?.[1];
    expect(site, "astro.config.mjs must declare the site URL").toBeTruthy();
    expect(robots).toContain(`Sitemap: ${site}/sitemap-index.xml`);
    expect(robots).toContain("Allow: /");
  });

  it("keeps the 404 pages for both languages, out of the sitemap", () => {
    for (const page of ["src/pages/404.astro", "src/pages/en/404.astro"]) {
      expect(() => read(page), page).not.toThrow();
    }
    // Error pages build to plain routes, so they must ask not to be indexed.
    for (const page of ["src/pages/404.astro", "src/pages/en/404.astro"]) {
      expect(read(page), page).toContain("noindex");
    }
    // And the sitemap config filters every 404 route out.
    expect(astroConfig).toMatch(/sitemap\(\{[\s\S]*filter:[\s\S]*"\/404"/);
    // Both must speak the same three strings.
    for (const key of ["notFound.title", "notFound.body", "notFound.back"]) {
      expect(read("src/i18n/bn.json")).toContain(`"${key}"`);
      expect(read("src/i18n/en.json")).toContain(`"${key}"`);
    }
  });
});

describe("the studio line", () => {
  it("sits in the page chrome, so focus mode fades it too", () => {
    expect(layout).toMatch(/<footer data-tk-chrome[^>]*>\s*© 2026 \{STUDIO\}/);
  });
});
