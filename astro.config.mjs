import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

import { generateCards } from "./scripts/generate-og.mjs";

/**
 * Per-page social cards, written into the build output after the pages exist.
 *
 * They go into `dist/` rather than `public/` on purpose: nothing generated is
 * ever committed, and every deploy regenerates the cards from the pages it
 * actually shipped. If the optional renderer is missing the build still
 * succeeds — the layout's `og:image` then simply points at a file that was not
 * written, so this logs a warning rather than failing a deploy over a card.
 */
function socialCards() {
  return {
    name: "type-kori-social-cards",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        try {
          const written = await generateCards(fileURLToPath(dir));
          logger.info(`social cards: ${written.length} written`);
        } catch (error) {
          logger.warn(`social cards skipped: ${error instanceof Error ? error.message : error}`);
        }
      },
    },
  };
}

/**
 * The canonical URL the layout emits for a site-root-relative path: Bangla at
 * the root, English under /en/. The homepage is the one path that keeps its
 * trailing slash, because that is what "/en/" resolves to in the mirror.
 */
function canonicalPath(path) {
  return path === "/" || path === "/en/" ? path : path.replace(/\/$/, "");
}

/** The same page in the other language, for a sitemap entry's alternates. */
function mirrorPathname(path) {
  if (path === "/en/") return "/";
  return path.startsWith("/en") ? path.slice(3) || "/" : `/en${path}`;
}

// The preview host injects PORT and requires the dev server to listen on all
// interfaces. HMR stays disabled in this environment.
export default defineConfig({
  site: "https://typekori.vercel.app",
  output: "static",
  trailingSlash: "ignore",
  integrations: [
    preact(),
    socialCards(),
    sitemap({
      // An error page is crawlable, not recommendable: keep every 404 route
      // out of the sitemap (the localised one builds to /en/404/).
      filter: (page) => !page.includes("/404"),
      serialize(item) {
        const url = new URL(item.url);
        const path = canonicalPath(url.pathname);
        const origin = url.origin;

        // Each entry names both editions explicitly, so a crawler can pair
        // them without inferring the language from the /en/ prefix. Bangla is
        // the default language, so x-default points at the Bangla URL, which
        // is also what the page's own hreflang cluster says.
        const isEnglish = path === "/en/" || path.startsWith("/en/");
        const bangla = isEnglish ? mirrorPathname(path) : path;
        const english = isEnglish ? path : mirrorPathname(path);

        return {
          url: new URL(path, origin).href,
          links: [
            { lang: "bn", url: new URL(bangla, origin).href },
            { lang: "en", url: new URL(english, origin).href },
            { lang: "x-default", url: new URL(bangla, origin).href },
          ],
        };
      },
    }),
  ],
  server: {
    host: true,
    port: Number(process.env.PORT ?? 4321),
  },
  vite: {
    plugins: [tailwindcss()],
    server: { hmr: false },
  },
});
