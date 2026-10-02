/*
 * The offline service worker, executed.
 *
 * A browser is not needed to know whether the worker keeps the site alive:
 * `public/sw.js` is plain JavaScript against the CacheStorage API, so this
 * harness loads it into a sandbox with a fake `self` and fake `caches`, then
 * drives the install, activate and fetch handlers exactly as a browser would —
 * and asserts the promises the worker hands back.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "public", "sw.js"), "utf8");

const ORIGIN = "https://type-kori.test";
const VERSION = "type-kori-v1";

const key = (request) =>
  new URL(typeof request === "string" ? request : (request.url ?? String(request)), ORIGIN).href;

class FakeCache {
  constructor() {
    this.entries = new Map();
  }
  async match(request) {
    return this.entries.get(key(request));
  }
  async put(request, response) {
    this.entries.set(key(request), response);
  }
  async addAll(requests) {
    for (const request of requests) {
      this.entries.set(key(request), new Response(`precached:${key(request)}`));
    }
  }
}

class FakeCaches {
  constructor() {
    this.stores = new Map();
    this.deleted = [];
  }
  async open(name) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache());
    return this.stores.get(name);
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name) {
    this.deleted.push(name);
    return this.stores.delete(name);
  }
  async match(request) {
    for (const store of this.stores.values()) {
      const hit = await store.match(request);
      if (hit !== undefined) return hit;
    }
    return undefined;
  }
}

/** Load the worker with a fake global scope, returning its listeners. */
function loadWorker({ caches = new FakeCaches(), fetchImpl } = {}) {
  const listeners = new Map();
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, handler) => listeners.set(type, handler),
    skipWaiting: async () => undefined,
    clients: { claim: async () => [] },
  };

  const network =
    fetchImpl ??
    (async (request) => new Response(`network:${key(request)}`, { status: 200 }));

  // `sw.js` is a classic worker script: it expects `self`, `caches` and
  // `fetch` as globals, which is exactly what this function's parameters give
  // it. Nothing else from the module scope leaks in.
  new Function("self", "caches", "fetch", "Response", "URL", source)(self, caches, network, Response, URL);

  return { listeners, caches, self };
}

/** Fire a fetch event and read back what the worker responded with. */
async function dispatchFetch(listeners, request) {
  let responded;
  listeners.get("fetch")({ request, respondWith: (promise) => (responded = promise) });
  return responded === undefined ? undefined : await responded;
}

const navigation = (path) => ({ url: `${ORIGIN}${path}`, method: "GET", mode: "navigate" });
const asset = (path) => ({ url: `${ORIGIN}${path}`, method: "GET", mode: "cors" });

async function install(worker) {
  await worker.listeners.get("install")({ waitUntil: (promise) => promise });
}

test("install precaches the offline shell", async () => {
  const worker = loadWorker();
  await install(worker);

  const cache = await worker.caches.open(VERSION);
  assert.notEqual(await cache.match("/"), undefined, "the home page must be precached");
  assert.notEqual(await cache.match("/manifest.webmanifest"), undefined);
  assert.notEqual(await cache.match("/favicon.svg"), undefined);
  assert.notEqual(await cache.match("/icon-maskable.svg"), undefined);
});

test("activate deletes every older cache and keeps the current one", async () => {
  const caches = new FakeCaches();
  await caches.open("type-kori-v0");
  await caches.open(VERSION);
  const worker = loadWorker({ caches });

  await worker.listeners.get("activate")({ waitUntil: (promise) => promise });

  assert.deepEqual(caches.deleted, ["type-kori-v0"]);
  assert.deepEqual(await caches.keys(), [VERSION]);
});

test("an online navigation is served fresh and cached for later", async () => {
  const worker = loadWorker();
  const response = await dispatchFetch(worker.listeners, navigation("/progress/"));

  assert.equal(await response.text(), `network:${ORIGIN}/progress/`);
  const cache = await worker.caches.open(VERSION);
  assert.notEqual(await cache.match("/progress/"), undefined, "the page must be cached on the way through");
});

test("an offline navigation falls back to the cached page", async () => {
  const worker = loadWorker();
  await install(worker);
  await dispatchFetch(worker.listeners, navigation("/lessons/"));

  // The network goes away after the page was visited once.
  const offline = loadWorker({
    caches: worker.caches,
    fetchImpl: async () => {
      throw new TypeError("network down");
    },
  });

  const response = await dispatchFetch(offline.listeners, navigation("/lessons/"));
  assert.equal(await response.text(), `network:${ORIGIN}/lessons/`);
});

test("an offline navigation to a never-visited route falls back to the home page", async () => {
  const worker = loadWorker({
    fetchImpl: async () => {
      throw new TypeError("network down");
    },
  });
  await install(worker);

  const response = await dispatchFetch(worker.listeners, navigation("/never-visited/"));
  assert.equal(await response.text(), `precached:${ORIGIN}/`);
});

test("assets are served from the cache while the network refreshes them", async () => {
  const caches = new FakeCaches();
  const cache = await caches.open(VERSION);
  await cache.put("/_astro/app.css", new Response("cached-css"));

  const worker = loadWorker({ caches });
  const response = await dispatchFetch(worker.listeners, asset("/_astro/app.css"));

  assert.equal(await response.text(), "cached-css", "the cached copy answers immediately");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(await (await cache.match("/_astro/app.css")).text(), `network:${ORIGIN}/_astro/app.css`);
});

test("an offline asset that was cached still loads", async () => {
  const caches = new FakeCaches();
  const cache = await caches.open(VERSION);
  await cache.put("/_astro/app.js", new Response("cached-js"));

  const worker = loadWorker({
    caches,
    fetchImpl: async () => {
      throw new TypeError("network down");
    },
  });

  const response = await dispatchFetch(worker.listeners, asset("/_astro/app.js"));
  assert.equal(await response.text(), "cached-js");
});

test("the worker stays out of non-GET and cross-origin requests", async () => {
  const worker = loadWorker();

  assert.equal(await dispatchFetch(worker.listeners, { url: `${ORIGIN}/api`, method: "POST" }), undefined);
  assert.equal(await dispatchFetch(worker.listeners, { url: "https://example.com/x", method: "GET" }), undefined);
});
