import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const WORKER = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

function requestKey(request) {
  return typeof request === "string" ? request : request.url;
}

function workerHarness(fetchImpl = fetch) {
  const listeners = new Map();
  const stores = new Map();
  const cacheFor = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      addAll: async (urls) => urls.forEach((url) => store.set(url, new Response(`cached:${url}`))),
      delete: async (request) => store.delete(requestKey(request)),
      match: async (request) => store.get(requestKey(request)),
      put: async (request, response) => store.set(requestKey(request), response),
    };
  };
  const caches = {
    delete: async (key) => stores.delete(key),
    keys: async () => [...stores.keys()],
    match: async (request) => {
      for (const store of stores.values()) {
        const found = store.get(requestKey(request));
        if (found) return found;
      }
    },
    open: async (name) => cacheFor(name),
  };
  const self = {
    addEventListener: (name, handler) => listeners.set(name, handler),
    clients: { claim: async () => {} },
    location: { origin: "https://spider.test" },
    skipWaiting: async () => {},
  };
  vm.runInNewContext(WORKER, { URL, Response, caches, fetch: fetchImpl, self });
  const dispatch = async (name, values = {}) => {
    let pending;
    listeners.get(name)({
      ...values,
      respondWith: (work) => {
        pending = Promise.resolve(work);
      },
      waitUntil: (work) => {
        pending = Promise.resolve(work);
      },
    });
    return pending;
  };
  return { caches, dispatch };
}

test("offline worker precaches the game shell and serves it after a navigation failure", async () => {
  const worker = workerHarness(async () => {
    throw new Error("offline");
  });
  await worker.dispatch("install");
  const response = await worker.dispatch("fetch", {
    request: { method: "GET", mode: "navigate", url: "https://spider.test/fight" },
  });
  assert.equal(await response.text(), "cached:/");
});

test("offline worker keeps API reads on the network", async () => {
  let requests = 0;
  const worker = workerHarness(async () => {
    requests += 1;
    return new Response("live");
  });
  await worker.dispatch("install");
  const pending = await worker.dispatch("fetch", {
    request: { method: "GET", mode: "cors", url: "https://spider.test/api/board" },
  });
  assert.equal(pending, undefined);
  assert.equal(requests, 0);
});
