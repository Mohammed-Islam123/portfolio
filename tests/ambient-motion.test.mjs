import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const scripts = {};
for (const name of ["DotField", "AmbientSignal"]) {
  const source = await readFile(new URL("../src/components/" + name + ".astro", import.meta.url), "utf8");
  scripts[name] = ts.transpileModule(source.match(/<script>([\s\S]*?)<\/script>/)[1], {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
}

function setup(name, reduced = false) {
  let Component, intersection, width = 1000, reads = 0, frameId = 0, time = 0;
  let color = "255, 255, 255", boost = "1";
  const frames = new Map();
  const ctx = new Proxy({ clears: 0, clearRect() { this.clears++; }, createRadialGradient: () => ({ addColorStop() {} }) }, {
    get: (object, key) => key in object ? object[key] : () => {},
  });
  const canvas = { style: {}, getContext: () => ctx };
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const pointer = Object.assign(new EventTarget(), { matches: true });
  const window = Object.assign(new EventTarget(), {
    devicePixelRatio: 3,
    matchMedia: (query) => query.includes("reduced-motion") ? motion : pointer,
  });
  const document = Object.assign(new EventTarget(), { hidden: false, documentElement: {} });
  runInNewContext(scripts[name], {
    HTMLElement: class extends EventTarget {
      querySelector() { return canvas; }
      getBoundingClientRect() { reads++; return { left: 0, top: 0, width, height: 600 }; }
    },
    window, document, performance: { now: () => time },
    getComputedStyle: () => ({ getPropertyValue: (key) => ({ "--field-color": color, "--field-alpha-boost": boost, "--platform-rgb": "37, 211, 102" })[key] }),
    customElements: { define(_, component) { Component = component; } },
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; intersection = this; }
      observe() {}
      disconnect() { this.disconnected = true; }
    },
  });
  const component = new Component();
  component.connectedCallback();
  return { component, canvas, ctx, motion, pointer, window, document, frames,
    reads: () => reads,
    visible(value) { intersection.callback([{ isIntersecting: value }]); },
    resize(value) { width = value; window.dispatchEvent(new Event("resize")); },
    theme() { color = "0, 0, 0"; boost = "2"; window.dispatchEvent(new Event("resize")); },
    move() { window.dispatchEvent(Object.assign(new Event("mousemove"), { clientX: 200, clientY: 200 })); },
    frame() {
      time += 1000 / 60;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(time));
    },
  };
}

for (const name of ["DotField", "AmbientSignal"]) {
  test(name + " follows live motion/visibility preferences without an offscreen frame loop", () => {
    const state = setup(name);
    assert.equal(state.frames.size, 0);
    state.visible(true);
    assert.equal(state.frames.size, 1);
    state.frame();
    state.motion.matches = true;
    state.motion.dispatchEvent(new Event("change"));
    assert.equal(state.frames.size, 0);
    const before = state.ctx.clears;
    state.frame();
    assert.equal(state.ctx.clears, before);
    state.visible(false);
    state.motion.matches = false;
    state.motion.dispatchEvent(new Event("change"));
    assert.equal(state.frames.size, 0);
    state.visible(true);
    assert.equal(state.frames.size, 1);
    state.document.hidden = true;
    state.document.dispatchEvent(new Event("visibilitychange"));
    assert.equal(state.frames.size, 0);
    state.document.hidden = false;
    state.document.dispatchEvent(new Event("visibilitychange"));
    assert.equal(state.frames.size, 1);
  });

  test(name + " resizes and refreshes its static theme with reduced motion", () => {
    const state = setup(name, true);
    assert.equal(state.canvas.width, 2000, "DPR remains capped at two");
    state.resize(500);
    assert.equal(state.canvas.width, 1000);
    const before = name === "DotField" ? state.ctx.fillStyle : state.ctx.strokeStyle;
    state.theme();
    const after = name === "DotField" ? state.ctx.fillStyle : state.ctx.strokeStyle;
    assert.notEqual(after, before);
    assert.equal(state.frames.size, 0);
  });

  test(name + " skips offscreen/coarse-pointer reads and removes listeners on disconnect", () => {
    const state = setup(name);
    const offscreenReads = state.reads();
    state.move();
    assert.equal(state.reads(), offscreenReads);
    state.visible(true);
    state.move();
    assert.equal(state.reads(), offscreenReads + 1);
    state.pointer.matches = false;
    state.pointer.dispatchEvent(new Event("change"));
    state.move();
    assert.equal(state.reads(), offscreenReads + 1);
    state.component.disconnectedCallback();
    const reads = state.reads(), clears = state.ctx.clears;
    state.resize(400); state.move(); state.theme();
    state.motion.matches = true;
    state.motion.dispatchEvent(new Event("change"));
    state.document.dispatchEvent(new Event("visibilitychange"));
    assert.equal(state.reads(), reads);
    assert.equal(state.ctx.clears, clears);
    assert.equal(state.frames.size, 0);
  });
}
