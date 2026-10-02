/**
 * The PWA shell is plain files in `public/` plus one registration script in
 * the base layout — nothing here runs in a service worker context, so the
 * tests read the files and assert the contract: a valid manifest whose icons
 * exist, a worker that caches and falls back, and a registration that stays
 * out of development builds.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

const manifest: {
  name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  icons?: { src: string; purpose?: string }[];
} = JSON.parse(read("public/manifest.webmanifest"));

const worker = read("public/sw.js");
const layout = read("src/layouts/BaseLayout.astro");

describe("the installable app shell", () => {
  it("declares a standalone app rooted at the home page", () => {
    expect(manifest.name).toBe("Type Kori");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("ships a regular icon and a maskable one, and both exist on disk", () => {
    expect(manifest.icons ?? []).toHaveLength(2);
    for (const icon of manifest.icons ?? []) {
      expect(() => read(`public${icon.src}`), icon.src).not.toThrow();
    }
    expect(manifest.icons?.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("the layout links the manifest", () => {
    expect(layout).toContain('rel="manifest"');
  });
});

describe("the offline service worker", () => {
  it("precaches, serves and cleans up", () => {
    expect(worker).toContain('addEventListener("install"');
    expect(worker).toContain('addEventListener("activate"');
    expect(worker).toContain('addEventListener("fetch"');
    // The offline fallback: a navigation that cannot reach the network still
    // resolves from the cache.
    expect(worker).toContain("caches.match");
  });

  it("only caches same-origin GET requests", () => {
    expect(worker).toContain('request.method !== "GET"');
    expect(worker).toContain("url.origin !== self.location.origin");
  });

  it("navigations go to the network first, so updates are never stuck behind the cache", () => {
    expect(worker).toContain('request.mode === "navigate"');
  });
});

describe("the registration", () => {
  it("is skipped in development, where caching would serve stale modules", () => {
    expect(layout).toContain("import.meta.env.PROD");
  });
});
