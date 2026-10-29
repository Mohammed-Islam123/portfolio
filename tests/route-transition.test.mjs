import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const { outputText } = ts.transpileModule(await readFile(new URL("../src/scripts/route-transition.ts", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});

function setup() {
  let timer = 0, starts = 0, resizes = 0;
  const lenis = { isStopped: false, stop() { this.isStopped = true; },
    start() { this.isStopped = false; starts++; }, resize() { resizes++; } };
  const timers = new Map();
  const classes = () => {
    const set = new Set();
    return {
      add: (...names) => names.forEach((name) => set.add(name)),
      remove: (...names) => names.forEach((name) => set.delete(name)),
      toggle: (name, on) => on ? set.add(name) : set.delete(name),
      contains: (name) => set.has(name),
    };
  };
  const page = { classList: classes() };
  const root = { classList: classes(), dataset: { loaderState: "dismissed" } };
  const loader = { setAttribute() {}, removeAttribute() {} };
  const document = Object.assign(new EventTarget(), {
    documentElement: root, querySelector: (selector) => selector === "[data-page-transition-root]" ? page : loader,
  });
  const window = Object.assign(new EventTarget(), {
    matchMedia: () => ({ matches: false }),
    setTimeout(callback) { timers.set(++timer, callback); return timer; },
    clearTimeout: (id) => timers.delete(id),
    scrollTo() {},
  });
  runInNewContext(outputText, {
    exports: {}, document, window, location: { hash: "" },
    require: (name) => name.includes("smooth-scroll") ? { getLenis: () => lenis } : {
      localeFromPath: (path) => path.startsWith("/fr/") ? "fr" : "en",
      unlocalizedPath: (path) => path.replace(/^\/fr(?=\/)/, ""),
    },
  });
  return { document, page, root, timers, lenis, starts: () => starts, resizes: () => resizes,
    navigate(from = "/", to = "/blog/") {
      const controller = new AbortController();
      document.dispatchEvent(Object.assign(new Event("astro:before-preparation"), {
        from: new URL(from, "https://example.test"), to: new URL(to, "https://example.test"), signal: controller.signal,
      }));
      return controller;
    },
  };
}

test("aborting navigation restores the page and loader state and restarts scrolling", () => {
  const state = setup();
  const controller = state.navigate("/blog/", "/");
  assert.equal(state.page.classList.contains("is-route-leaving"), true);
  assert.equal(state.root.dataset.loaderState, "loading");
  controller.abort();
  assert.equal(state.page.classList.contains("is-route-leaving"), false);
  assert.equal(state.root.classList.contains("route-transitioning"), false);
  assert.equal(state.root.dataset.loaderState, "dismissed");
  assert.equal(state.root.dataset.clientNavigation, undefined);
  assert.equal(state.starts(), 1);
});

test("a ready page can scroll immediately, before the transition cleanup timer", () => {
  const state = setup();
  state.navigate();
  assert.equal(state.lenis.isStopped, true);
  state.document.dispatchEvent(new Event("astro:after-swap"));
  state.document.dispatchEvent(new Event("astro:page-load"));
  assert.equal(state.lenis.isStopped, false);
  assert.equal(state.resizes(), 1);
  assert.equal(state.timers.size, 1);
});

test("transition cleanup cannot resume scrolling before the boot loader is dismissed", () => {
  const state = setup();
  state.navigate();
  state.root.dataset.loaderState = "loading";
  state.document.dispatchEvent(new Event("astro:page-load"));
  for (const callback of state.timers.values()) callback();
  assert.equal(state.lenis.isStopped, true);
  assert.equal(state.starts(), 0);
});

test("a completed navigation's later abort cannot reset the new page state", () => {
  const state = setup();
  const controller = state.navigate();
  state.document.dispatchEvent(new Event("astro:after-swap"));
  state.root.dataset.loaderState = "new-page-state";
  controller.abort();
  assert.equal(state.root.dataset.loaderState, "new-page-state");
  assert.equal(state.starts(), 0);
});

test("a new navigation cancels the old cleanup timer and language navigation keeps its lighter transition", () => {
  const state = setup();
  state.document.dispatchEvent(new Event("astro:page-load"));
  assert.equal(state.timers.size, 1);
  const controller = state.navigate("/", "/fr/");
  assert.equal(state.timers.size, 0);
  assert.equal(state.root.classList.contains("language-transitioning"), true);
  assert.equal(state.page.classList.contains("is-route-leaving"), false);
  controller.abort();
  assert.equal(state.root.classList.contains("language-transitioning"), false);
});
