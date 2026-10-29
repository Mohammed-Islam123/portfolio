import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/scripts/custom-cursor.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});

function setup({ reduced = false, fine = true } = {}) {
  let time = 0, frameId = 0, writes = 0;
  const frames = new Map();
  class ElementStub {
    children = [];
    style = new Proxy({}, { set(object, key, value) {
      if (key === "transform") writes++;
      object[key] = value;
      return true;
    } });
    classes = new Set();
    classList = {
      add: (name) => this.classes.add(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
    };
    append(...children) { this.children.push(...children); }
    setAttribute() {}
  }
  const root = new ElementStub();
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const pointer = Object.assign(new EventTarget(), { matches: fine });
  const window = Object.assign(new EventTarget(), {
    matchMedia: (query) => query.includes("reduced-motion") ? motion : pointer,
  });
  const document = Object.assign(new EventTarget(), {
    hidden: false, documentElement: root, createElement: () => new ElementStub(),
  });
  runInNewContext(outputText, {
    exports: {},
    require: () => ({ useTranslations: () => (key) => key }),
    window,
    document, performance: { now: () => time },
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  const [ring, dot, label] = root.children;
  const pointerAt = (...ancestors) => {
    const event = Object.assign(new Event("pointermove"), {
      clientX: 200, clientY: 200, pointerType: "mouse",
    });
    Object.defineProperty(event, "target", {
      value: { closest: (query) => query.split(",").some((part) => ancestors.includes(part.trim())) ? {} : null },
    });
    window.dispatchEvent(event);
  };
  return { root, ring, dot, label, window, document, motion, pointer, pointerAt, frames,
    writes: () => writes,
    advance(count, hz = 60) {
      for (let i = 0; i < count; i++) {
        time += 1000 / hz;
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback(time));
      }
    },
  };
}

test("the large cursor stays off hero photos and the viewer, then returns elsewhere", () => {
  const { ring, dot, label, window, pointerAt } = setup();
  for (const media of [".journey-face", ".journey-viewer"]) {
    pointerAt("button", media);
    assert.equal(ring.style.visibility, "hidden");
    assert.equal(ring.style.opacity, "0");
    assert.equal(dot.style.visibility, "visible");
    assert.equal(label.style.visibility, "hidden");

    pointerAt("a");
    assert.equal(ring.style.visibility, "visible");
    assert.ok(ring.classes.has("c-ring--active"));
  }
  pointerAt('[data-cursor="swipe"]');
  assert.equal(label.style.visibility, "visible");
  pointerAt();
  assert.equal(ring.style.visibility, "visible");
  assert.equal(label.style.visibility, "hidden");
  window.dispatchEvent(new Event("mouseleave"));
  assert.equal(ring.style.visibility, "hidden");
  assert.equal(dot.style.visibility, "hidden");
});

test("the cursor stops writing transforms when settled and restarts on movement", () => {
  const state = setup();
  state.pointerAt();
  state.advance(120);
  assert.equal(state.frames.size, 0);
  const writes = state.writes();
  state.advance(120);
  assert.equal(state.writes(), writes);
  state.pointerAt("a");
  assert.equal(state.frames.size, 1);
});

test("cursor smoothing has the same response at equal elapsed time on different refresh rates", () => {
  const slow = setup(), fast = setup();
  slow.pointerAt(); fast.pointerAt();
  slow.advance(6, 60); fast.advance(12, 120);
  const x = (element) => Number(element.style.transform.match(/translate3d\(([^p]+)px/)[1]);
  assert.ok(Math.abs(x(slow.ring) - x(fast.ring)) < 1e-9);
  assert.ok(Math.abs(x(slow.dot) - x(fast.dot)) < 1e-9);
});

test("live preferences restore the native cursor and can enable the custom cursor later", () => {
  const state = setup({ reduced: true });
  state.pointerAt();
  assert.equal(state.frames.size, 0);
  assert.equal(state.root.classes.has("cursor-custom"), false);
  state.motion.matches = false;
  state.motion.dispatchEvent(new Event("change"));
  state.pointerAt();
  assert.equal(state.frames.size, 1);
  state.motion.matches = true;
  state.motion.dispatchEvent(new Event("change"));
  assert.equal(state.frames.size, 0);
  assert.equal(state.dot.style.visibility, "hidden");
  state.document.dispatchEvent(new Event("astro:after-swap"));
  assert.equal(state.root.classes.has("cursor-custom"), false);
  state.motion.matches = false;
  state.pointer.matches = false;
  state.pointer.dispatchEvent(new Event("change"));
  state.pointerAt();
  assert.equal(state.frames.size, 0);
});

test("hiding the document cancels cursor work until the next visible pointer movement", () => {
  const state = setup();
  state.pointerAt();
  state.document.hidden = true;
  state.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(state.frames.size, 0);
  assert.equal(state.dot.style.visibility, "hidden");
  state.pointerAt();
  assert.equal(state.frames.size, 0);
  state.document.hidden = false;
  state.pointerAt();
  assert.equal(state.frames.size, 1);
});
