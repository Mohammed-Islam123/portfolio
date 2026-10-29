import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/scripts/reveal.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } });

class ElementStub {
  constructor(top = 1000, children = [], reveal = true) {
    this.top = top;
    this.children = children;
    const classes = new Set(reveal ? ["reveal"] : []);
    this.classList = {
      contains: (name) => classes.has(name),
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
    };
  }
  getBoundingClientRect() { return { top: this.top }; }
  querySelectorAll(selector) { return this.children.filter((el) => el.classList.contains(selector.slice(1))); }
}

function setup({ reduced = false, supported = true } = {}) {
  const visible = new ElementStub(100);
  const offscreen = new ElementStub(1000);
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const document = Object.assign(new EventTarget(), {
    body: {},
    elements: [visible, offscreen],
    querySelectorAll(selector) { return this.elements.filter((el) => el.classList.contains(selector.slice(1))); },
  });
  const intersections = [], mutations = [];
  class IO {
    targets = new Set();
    constructor(callback) { this.callback = callback; intersections.push(this); }
    observe(el) { this.targets.add(el); }
    unobserve(el) { this.targets.delete(el); }
    disconnect() { this.disconnected = true; this.targets.clear(); }
  }
  class MO {
    constructor(callback) { this.callback = callback; mutations.push(this); }
    observe(body) { this.body = body; }
    disconnect() { this.disconnected = true; }
  }
  runInNewContext(outputText, {
    window: { matchMedia: () => motion, innerHeight: 800 },
    document, Element: ElementStub, MutationObserver: MO,
    ...(supported ? { IntersectionObserver: IO } : {}),
  });
  return { document, visible, offscreen, motion, intersections, mutations };
}

test("visible content is never hidden; offscreen content reveals once it intersects", () => {
  const state = setup();
  assert.equal(state.visible.classList.contains("reveal-init"), false);
  assert.equal(state.offscreen.classList.contains("reveal-init"), true);
  const io = state.intersections[0];
  io.callback([{ target: state.offscreen, isIntersecting: true }]);
  assert.equal(state.offscreen.classList.contains("reveal-init"), false);
  assert.equal(state.offscreen.classList.contains("is-visible"), true);
  assert.equal(io.targets.size, 0);
});

test("reduced motion and missing observers leave static content visible", () => {
  for (const options of [{ reduced: true }, { supported: false }]) {
    const state = setup(options);
    assert.equal(state.offscreen.classList.contains("reveal-init"), false);
    assert.equal(state.intersections.length, 0);
  }
});

test("Astro swaps disconnect old observers and bind to the new body", () => {
  const state = setup();
  state.document.dispatchEvent(new Event("astro:before-swap"));
  assert.equal(state.intersections[0].disconnected, true);
  assert.equal(state.mutations[0].disconnected, true);
  assert.equal(state.offscreen.classList.contains("reveal-init"), false);
  const next = new ElementStub();
  state.document.body = {};
  state.document.elements = [next];
  state.document.dispatchEvent(new Event("astro:page-load"));
  assert.equal(state.intersections.length, 2);
  assert.equal(state.intersections[1].targets.has(next), true);
  assert.equal(state.mutations[1].body, state.document.body);
});

test("dynamic content is observed and enabling reduced motion releases hidden content", () => {
  const state = setup();
  const child = new ElementStub();
  const wrapper = new ElementStub(1000, [child], false);
  state.document.elements.push(child);
  state.mutations[0].callback([{ addedNodes: [wrapper, {}] }]);
  assert.equal(child.classList.contains("reveal-init"), true);
  state.motion.matches = true;
  state.motion.dispatchEvent(new Event("change"));
  assert.equal(child.classList.contains("reveal-init"), false);
  assert.equal(state.offscreen.classList.contains("reveal-init"), false);
  assert.equal(state.intersections[0].disconnected, true);
});
