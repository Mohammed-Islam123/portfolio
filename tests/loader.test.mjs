import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/components/Loader.astro", import.meta.url), "utf8");
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
const { outputText } = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022 } });

function setup(readyState = "complete", clientNavigation = false) {
  const timers = new Map();
  let nextTimer = 0;
  const window = Object.assign(new EventTarget(), {
    matchMedia: () => ({ matches: true }),
    setTimeout(action, delay) { timers.set(++nextTimer, { action, delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
  });
  const document = Object.assign(new EventTarget(), {
    readyState,
    documentElement: {
      dataset: { clientNavigation: String(clientNavigation) },
      classList: { add() {}, remove() {} },
    },
  });
  const states = [];
  window.addEventListener("loader:statechange", (event) => states.push(event.detail.state));
  let Component;
  runInNewContext(outputText, {
    HTMLElement: class {
      dataset = { mode: "home", command: "whoami", typeDuration: "760" };
      setAttribute() {}
      querySelector() { return { classList: { add() {} } }; }
      remove() {}
    },
    window, document, CustomEvent,
    cancelAnimationFrame() {},
    customElements: { get: () => undefined, define: (_, component) => { Component = component; } },
  });
  const component = new Component();
  component.connectedCallback();
  return { component, window, document, states, timers };
}

test("a ready page dismisses immediately without an artificial minimum wait", () => {
  const control = setup();
  assert.deepEqual(control.states, ["loading", "dismissed"]);
  assert.equal(control.document.documentElement.dataset.loaderState, "dismissed");
  control.component.disconnectedCallback();
  assert.equal(control.timers.size, 0);
});

test("initial navigation waits for load, then dismisses without an extra delay", () => {
  const control = setup("loading");
  assert.deepEqual(control.states, ["loading"]);
  control.window.dispatchEvent(new Event("load"));
  assert.deepEqual(control.states, ["loading", "dismissed"]);
  control.component.disconnectedCallback();
});

test("Astro navigation still waits for the incoming page lifecycle", () => {
  const control = setup("complete", true);
  assert.deepEqual(control.states, ["loading"]);
  control.document.dispatchEvent(new Event("astro:page-load"));
  assert.deepEqual(control.states, ["loading", "dismissed"]);
  control.component.disconnectedCallback();
});

test("detaching cancels the load listener and safety timer", () => {
  const control = setup("loading");
  control.component.disconnectedCallback();
  control.window.dispatchEvent(new Event("load"));
  assert.deepEqual(control.states, ["loading"]);
  assert.equal(control.timers.size, 0);
});
