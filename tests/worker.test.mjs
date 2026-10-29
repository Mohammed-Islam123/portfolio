import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../src/worker.js";

test("explicit French and English error documents retain their body and headers with status 404", async () => {
  for (const path of ["/404", "/404/", "/404.html", "/fr/404", "/fr/404/", "/fr/404/index.html"]) {
    const response = await worker.fetch(new Request("https://example.test" + path + "?check=1"), {
      ASSETS: { async fetch() { return new Response("Localized error", { headers: { "Content-Type": "text/html", "X-Robots-Tag": "noindex" } }); } },
    });
    assert.equal(response.status, 404, path);
    assert.equal(await response.text(), "Localized error");
    assert.equal(response.headers.get("Content-Type"), "text/html");
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex");
  }
});

test("normal assets, missing pages, redirects and server errors pass through", async () => {
  for (const [path, status] of [["/fr/", 200], ["/fr/404-story/", 200], ["/missing/", 404], ["/fr/404", 307], ["/fr/404/", 503]]) {
    const original = new Response("Asset", { status });
    const response = await worker.fetch(new Request("https://example.test" + path), { ASSETS: { async fetch() { return original; } } });
    assert.equal(response, original, path + " " + status);
  }
});

test("cached success validators cannot produce 304 for an error document", async () => {
  const request = new Request("https://example.test/fr/404/", {
    headers: { "If-None-Match": '"old-200"', "If-Modified-Since": "Wed, 28 Oct 2026 00:00:00 GMT", "Accept-Language": "fr" },
  });
  const response = await worker.fetch(request, {
    ASSETS: { async fetch(assetRequest) {
      assert.equal(assetRequest.headers.get("If-None-Match"), null);
      assert.equal(assetRequest.headers.get("If-Modified-Since"), null);
      assert.equal(assetRequest.headers.get("Accept-Language"), "fr");
      return new Response("Error");
    } },
  });
  assert.equal(response.status, 404);
  assert.equal(request.headers.get("If-None-Match"), '"old-200"');
});

test("normal asset requests retain their conditional headers", async () => {
  const request = new Request("https://example.test/fr/", { headers: { "If-None-Match": '"current"' } });
  const response = await worker.fetch(request, { ASSETS: { async fetch(assetRequest) {
    assert.equal(assetRequest, request);
    return new Response(null, { status: 304 });
  } } });
  assert.equal(response.status, 304);
});

test("HEAD error responses remain bodyless", async () => {
  const response = await worker.fetch(new Request("https://example.test/fr/404/", { method: "HEAD" }), {
    ASSETS: { async fetch(request) {
      assert.equal(request.method, "HEAD");
      return new Response(null, { headers: { "Content-Type": "text/html" } });
    } },
  });
  assert.equal(response.status, 404);
  assert.equal(await response.text(), "");
});

test("the hosting configuration runs the handler before only explicit error assets", async () => {
  const config = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(config.main, "src/worker.js");
  assert.equal(config.assets.binding, "ASSETS");
  assert.deepEqual(config.assets.run_worker_first, ["/404", "/404/", "/404.html", "/fr/404", "/fr/404/", "/fr/404/index.html"]);
});
