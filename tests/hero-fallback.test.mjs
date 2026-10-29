import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const scripts = {};
for (const name of ["Hero", "ScrambleName"]) {
  const source = await readFile(new URL("../src/components/" + name + ".astro", import.meta.url), "utf8");
  scripts[name] = ts.transpileModule(source.match(/<script>([\s\S]*?)<\/script>/)[1], {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
}
const fullName = "Mohamed Islam Benyahkem";

function setup(name, { loaderState, reduced = false, client = false } = {}) {
  const classes = new Set();
  const text = { textContent: fullName, style: {} };
  const live = { textContent: "" };
  const timers = new Map(), starts = [];
  let timer = 0, Component;
  const window = Object.assign(new EventTarget(), { matchMedia: () => ({ matches: reduced }) });
  const document = Object.assign(new EventTarget(), {
    documentElement: { dataset: { loaderState, clientNavigation: String(client) } },
  });
  runInNewContext(scripts[name], {
    exports: {},
    require(specifier) {
      if (specifier.endsWith("/site")) return { siteConfig: { name: fullName } };
      if (specifier.endsWith("/scrambler")) return { Scrambler: class {
        constructor(update) { this.update = update; }
        start(from, to) { starts.push([from, to]); this.update(to); }
        cancel() {}
      } };
      return { playSound() {} };
    },
    HTMLElement: class {
      classList = {
        add: (...names) => names.forEach((value) => classes.add(value)),
        remove: (...names) => names.forEach((value) => classes.delete(value)),
      };
      querySelector(selector) { return selector === ".sn-text" ? text : selector === ".sn-live" ? live : null; }
      querySelectorAll() { return []; }
    },
    window, document,
    setTimeout(action, delay) { timers.set(++timer, { action, delay }); return timer; },
    clearTimeout(id) { timers.delete(id); },
    customElements: { define: (_, component) => { Component = component; } },
  });
  const component = new Component();
  component.connectedCallback();
  return { component, window, document, classes, text, live, timers, starts };
}

test("hero remains visible with no loader module and detaches state listeners", () => {
  const state = setup("Hero");
  assert.equal(state.classes.has("revealed"), true);
  assert.equal(state.classes.has("is-loading"), false);
  state.component.disconnectedCallback();
  state.window.dispatchEvent(new CustomEvent("loader:statechange", { detail: { state: "loading" } }));
  assert.equal(state.classes.has("is-loading"), false);
  assert.equal(state.timers.size, 0);
});

test("a working loader stages the hero and dismissal releases it", () => {
  const state = setup("Hero", { loaderState: "loading" });
  assert.equal(state.classes.has("is-loading"), true);
  state.window.dispatchEvent(new Event("loader:dismiss"));
  assert.equal(state.classes.has("revealed"), true);
  assert.equal(state.classes.has("is-loading"), false);
  state.component.disconnectedCallback();
});

test("late loader initialization can still enhance the entrance", () => {
  const state = setup("Hero");
  state.window.dispatchEvent(new CustomEvent("loader:statechange", { detail: { state: "loading" } }));
  assert.equal(state.classes.has("is-enhanced"), true);
  assert.equal(state.classes.has("is-loading"), true);
  assert.equal(state.classes.has("is-client-navigation"), false);
  state.component.disconnectedCallback();
});

test("reduced motion and client navigation do not hide the hero", () => {
  for (const options of [{ reduced: true }, { client: true }]) {
    const state = setup("Hero", { loaderState: "loading", ...options });
    assert.equal(state.classes.has("revealed"), true);
    assert.equal(state.classes.has("is-loading"), false);
    state.component.disconnectedCallback();
  }
});

test("name remains readable with a blocked loader or reduced motion", () => {
  for (const options of [{}, { loaderState: "loading", reduced: true }]) {
    const state = setup("ScrambleName", options);
    assert.equal(state.text.textContent, fullName);
    assert.equal(state.live.textContent, fullName);
    assert.equal(state.starts.length, 0);
    assert.equal(state.timers.size, 0);
    state.component.disconnectedCallback();
  }
});

test("the existing name scramble waits for the active loader and cleans up", () => {
  const state = setup("ScrambleName", { loaderState: "loading" });
  assert.equal(state.text.textContent, "");
  assert.equal(state.starts.length, 0);
  state.window.dispatchEvent(new Event("loader:dismiss"));
  [...state.timers.values()].find(({ delay }) => delay === 150).action();
  assert.deepEqual(state.starts, [["", fullName]]);
  state.component.disconnectedCallback();
  assert.equal(state.timers.size, 0);
});
