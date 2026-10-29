import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/components/Loader.astro", import.meta.url), "utf8");
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
const bootstrap = source.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
const { outputText } = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022 } });
const flush = () => new Promise(setImmediate);

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup({ readyState = "complete", client = false, reduced = false, typingDone = false,
  fontsPending = false, portraitPending = false, animationPresent = true, mode = "home" } = {}) {
  const typing = deferred(), fonts = deferred(), portrait = deferred();
  if (typingDone) typing.resolve();
  if (!fontsPending) fonts.resolve();
  if (!portraitPending) portrait.resolve();
  const timers = new Map(), classes = new Set(), states = [];
  let nextTimer = 0, Component, decodeCalls = 0, now = 0;
  const window = Object.assign(new EventTarget(), {
    matchMedia: () => ({ matches: reduced }),
    setTimeout(action, delay) { timers.set(++nextTimer, { action, at: now + delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
  });
  const document = Object.assign(new EventTarget(), {
    readyState,
    fonts: { ready: fonts.promise },
    querySelector: () => ({ decode() { decodeCalls++; return portrait.promise; } }),
    documentElement: {
      dataset: { clientNavigation: String(client) },
      classList: { add: (value) => classes.add(value), remove: (value) => classes.delete(value) },
    },
  });
  window.addEventListener("loader:statechange", (event) => states.push(event.detail.state));
  runInNewContext(outputText, {
    HTMLElement: class {
      dataset = { mode };
      attributes = new Set();
      isConnected = true;
      dismissals = 0;
      setAttribute(name) { this.attributes.add(name); }
      removeAttribute(name) { this.attributes.delete(name); }
      querySelector(selector) {
        if (selector === ".loader-command-text") return {
          getAnimations: () => animationPresent ? [{ animationName: "loader-type", finished: typing.promise }] : [],
        };
        return { classList: { add: () => this.dismissals++ } };
      }
      remove() { this.isConnected = false; this.disconnectedCallback(); }
    },
    window, document, CustomEvent, AbortController,
    customElements: { get: () => undefined, define: (_, component) => { Component = component; } },
  });
  const mount = () => { const component = new Component(); component.connectedCallback(); return component; };
  const advance = (milliseconds) => {
    const target = now + milliseconds;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]);
      now = next[1].at;
      next[1].action();
    }
    now = target;
  };
  return { component: mount(), mount, window, document, states, timers, classes,
    typing, fonts, portrait, advance, decodeCalls: () => decodeCalls };
}

test("the first HTML paint has a visible overlay and a stable command layout", () => {
  const css = [...source.matchAll(/<style>([\s\S]*?)<\/style>/g)].at(-1)[1];
  assert.match(css, /\.loader-overlay\s*\{[^}]*display:\s*grid/);
  assert.match(css, /\.loader-terminal\s*\{[^}]*inline-size:/);
  assert.match(css, /\.loader-command\s*\{[^}]*display:\s*inline-grid/);
  assert.match(css, /animation:\s*loader-type[^;]*steps\(var\(--command-length\), end\)/);
  assert.match(css, /loader-status-in[^;]*var\(--type-duration, 0ms\)/);
  assert.doesNotMatch(script, /requestAnimationFrame|textContent\s*=/);
  assert.match(source, /<noscript><style>\.loader-overlay\{display:none\}/);
});

test("typing finishes before load and the loading status stays until readiness", async () => {
  const state = setup({ readyState: "loading" });
  state.typing.resolve();
  await flush();
  assert.ok(state.component.attributes.has("data-command-complete"));
  assert.deepEqual(state.states, ["loading"]);
  state.advance(1000);
  assert.deepEqual(state.states, ["loading"]);
  assert.equal(state.timers.size, 0, "The completed hold must not declare a loading page ready");
  state.window.dispatchEvent(new Event("load"));
  await flush();
  assert.deepEqual(state.states, ["loading", "dismissed"]);
  assert.equal(state.component.dismissals, 1);
  state.component.disconnectedCallback();
});

test("a fast page waits for full typing and exactly another 1000 ms", async () => {
  const state = setup();
  await flush();
  assert.deepEqual(state.states, ["loading"]);
  state.typing.resolve();
  await flush();
  assert.deepEqual(state.states, ["loading"]);
  state.advance(999);
  assert.deepEqual(state.states, ["loading"]);
  state.advance(1);
  assert.deepEqual(state.states, ["loading", "dismissed"]);
  state.component.disconnectedCallback();
});

test("an animation completed before module startup is still recognized", async () => {
  const state = setup({ typingDone: true });
  await flush();
  state.advance(1000);
  assert.deepEqual(state.states, ["loading", "dismissed"]);
  state.component.disconnectedCallback();
});

test("fonts and the initial portrait must both settle before reveal", async () => {
  const state = setup({ typingDone: true, fontsPending: true, portraitPending: true });
  await flush();
  state.advance(1000);
  assert.deepEqual(state.states, ["loading"]);
  state.fonts.resolve();
  await flush();
  assert.deepEqual(state.states, ["loading"]);
  state.portrait.resolve();
  await flush();
  assert.deepEqual(state.states, ["loading", "dismissed"]);
  assert.equal(state.decodeCalls(), 1);
  state.component.disconnectedCallback();
});

test("failed optional assets release the loader instead of trapping visitors", async () => {
  const state = setup({ typingDone: true, fontsPending: true, portraitPending: true });
  state.fonts.reject(new Error("Font unavailable"));
  state.portrait.reject(new Error("Portrait unavailable"));
  await flush();
  state.advance(1000);
  assert.deepEqual(state.states, ["loading", "dismissed"]);
  state.component.disconnectedCallback();
});

test("Astro navigation waits for its page lifecycle and incoming assets", async () => {
  const state = setup({ client: true, typingDone: true, portraitPending: true });
  state.window.dispatchEvent(new Event("load"));
  await flush();
  state.advance(1000);
  assert.equal(state.decodeCalls(), 0);
  assert.deepEqual(state.states, ["loading"]);
  state.document.dispatchEvent(new Event("astro:page-load"));
  await flush();
  assert.equal(state.decodeCalls(), 1);
  assert.deepEqual(state.states, ["loading"]);
  state.portrait.resolve();
  await flush();
  assert.deepEqual(state.states, ["loading", "dismissed"]);
  state.component.disconnectedCallback();
});

test("reduced motion and disabled animations skip typing without skipping readiness", async () => {
  for (const options of [{ reduced: true }, { animationPresent: false }]) {
    const state = setup({ ...options, portraitPending: true });
    await flush();
    assert.ok(state.component.attributes.has("data-command-complete"));
    assert.deepEqual(state.states, ["loading"]);
    state.portrait.resolve();
    await flush();
    assert.deepEqual(state.states, ["loading"]);
    state.advance(1000);
    assert.deepEqual(state.states, ["loading", "dismissed"]);
    state.component.disconnectedCallback();
  }
});

test("cancelled CSS animation still allows a completed command and safe dismissal", async () => {
  const state = setup();
  state.typing.reject(new Error("Animation cancelled"));
  await flush();
  state.advance(1000);
  assert.deepEqual(state.states, ["loading", "dismissed"]);
  state.component.disconnectedCallback();
});

test("detaching cancels lifecycle listeners and ignores pending asset completion", async () => {
  const state = setup({ readyState: "loading" });
  state.component.disconnectedCallback();
  state.window.dispatchEvent(new Event("load"));
  state.typing.resolve();
  await flush();
  assert.equal(state.decodeCalls(), 0);
  assert.deepEqual(state.states, ["loading"]);
  assert.equal(state.timers.size, 0);
  assert.equal(state.classes.has("loader-scroll-lock"), false);
});

test("outgoing loaders cannot unlock or dismiss their replacement", async () => {
  const state = setup({ fontsPending: true, typingDone: true });
  const incoming = state.mount();
  state.component.disconnectedCallback();
  assert.equal(state.classes.has("loader-scroll-lock"), true);
  state.fonts.resolve();
  await flush();
  state.advance(1000);
  assert.equal(state.component.dismissals, 0);
  assert.equal(incoming.dismissals, 1);
  incoming.disconnectedCallback();
  assert.equal(state.timers.size, 0);
});

test("detaching during the post-typing hold cancels its timer", async () => {
  const state = setup({ typingDone: true });
  await flush();
  assert.equal(state.timers.size, 1);
  state.component.disconnectedCallback();
  state.advance(1000);
  assert.equal(state.timers.size, 0);
  assert.deepEqual(state.states, ["loading"]);
});

test("a generic loader without a command does not add the reading pause", async () => {
  const state = setup({ mode: "generic" });
  await flush();
  assert.deepEqual(state.states, ["loading", "dismissed"]);
  state.component.disconnectedCallback();
});

function bootstrapState(active = false, localName = "boot-loader") {
  const states = [], timers = [];
  const loader = {
    localName,
    isConnected: true,
    active,
    hasAttribute() { return this.active; },
    remove() { this.isConnected = false; },
  };
  const document = {
    currentScript: { previousElementSibling: loader },
    documentElement: { dataset: {}, classList: { remove() {} } },
  };
  const window = Object.assign(new EventTarget(), { setTimeout(action) { timers.push(action); } });
  window.addEventListener("loader:statechange", (event) => states.push(event.detail.state));
  runInNewContext(bootstrap, { window, document, CustomEvent });
  return { loader, document, states, timers };
}

test("bootstrap establishes loading before hero initialization and fails open if its module is blocked", () => {
  const state = bootstrapState();
  assert.equal(state.document.documentElement.dataset.loaderState, "loading");
  state.timers[0]();
  assert.equal(state.loader.isConnected, false);
  assert.equal(state.document.documentElement.dataset.loaderState, "dismissed");
  assert.deepEqual(state.states, ["dismissed"]);
});

test("the startup watchdog never interrupts an active loader or a detached page", () => {
  for (const change of [(loader) => { loader.active = true; }, (loader) => { loader.isConnected = false; }]) {
    const state = bootstrapState();
    change(state.loader);
    state.timers[0]();
    assert.deepEqual(state.states, []);
  }
  assert.equal(bootstrapState(true).timers.length, 0);
  assert.equal(bootstrapState(false, "noscript").timers.length, 0, "Language navigation removes the boot loader");
});
