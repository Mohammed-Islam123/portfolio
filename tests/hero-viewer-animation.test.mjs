import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/scripts/hero-journey.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});
function setup() {
  let Component;
  const motion = { matches: false };
  const calls = [];
  const current = { transform: "matrix(0.5, 0, 0, 0.5, -100, -60)", clipPath: "inset(10% 0%)", opacity: "0.95" };
  const target = { left: 400, top: 200, width: 640, height: 480 };
  const content = {
    animate(frames, options) {
      const animation = { finished: Promise.resolve(), cancel() { this.cancelled = true; } };
      calls.push({ frames, options, animation });
      return animation;
    },
  };
  const viewer = {
    open: true,
    querySelector: (selector) => selector === ".journey-viewer-content" ? content : { getBoundingClientRect: () => target },
    close() { this.open = false; },
  };
  const slot = {
    card: { dataset: { expanded: "true", settling: "true", viewing: "true" } },
    face: {
      offsetWidth: 120, offsetHeight: 90,
      getBoundingClientRect: () => ({ left: 100, top: 120, width: 120, height: 90 }),
    },
    settleTimer: 1, pinned: true, dismissed: false,
  };
  runInNewContext(outputText, {
    exports: {}, HTMLElement: class {},
    require: () => ({ playSound() {} }),
    window: { matchMedia: () => motion, clearTimeout() {} },
    customElements: { get() {}, define(_, value) { Component = value; } },
    DOMMatrixReadOnly: class { a = 1; b = 0; },
    getComputedStyle: (element) => element === content ? current : {
      transform: "none", opacity: "0.9",
      getPropertyValue: () => "cubic-bezier(0.16, 1, 0.3, 1)",
    },
  });
  const hero = new Component();
  hero.querySelector = () => viewer;
  hero.viewerSlot = slot;
  let collapsedBeforeMeasure = false;
  hero.render = () => { collapsedBeforeMeasure = slot.card.dataset.expanded === "false" && !slot.card.dataset.settling; };
  return { hero, viewer, slot, motion, calls, current, target, collapsed: () => collapsedBeforeMeasure };
}

test("photo animates inside a stationary dialog without width or height keyframes", () => {
  const { hero, calls } = setup();
  hero.animateViewer({ left: 100, top: 120, width: 120, height: 90, rotation: 12, opacity: 0.9 });
  const { frames, options } = calls[0];
  assert.equal(frames[0].transform, "translate(-560px, -275px) rotate(12deg) scale(0.1875)");
  assert.equal(frames[0].opacity, 0.9);
  assert.equal(frames[1].transform, "translate(0px, 0px) rotate(0deg) scale(1)");
  assert.ok(frames.every((frame) => !("width" in frame) && !("height" in frame)));
  assert.equal(options.duration, 480);
  assert.equal(options.fill, "both", "Keep the return endpoint until the dialog closes");
});

test("a portrait photo starts with the thumbnail crop and keeps uniform scaling", () => {
  const { hero, calls, target } = setup();
  target.width = 320;
  hero.animateViewer({ left: 100, top: 120, width: 120, height: 90, rotation: 0, opacity: 1 });
  assert.equal(calls[0].frames[0].clipPath, "inset(25% 0%)");
  assert.ok(calls[0].frames[0].transform.endsWith("scale(0.375)"));
  assert.equal(calls[0].frames[1].clipPath, "inset(0% 0%)");
});

test("closing mid-open continues from the displayed frame to the normal card", async () => {
  const state = setup();
  state.hero.viewerAnimation = state.hero.animateViewer(state.hero.viewerOrigin(state.slot));
  const closing = state.hero.closeViewer();
  await state.hero.closeViewer();
  await closing;
  assert.equal(state.calls.length, 2, "Repeated close events must not start another animation");
  assert.equal(state.calls[0].animation.cancelled, true);
  assert.equal(state.calls[1].frames[0].transform, state.current.transform);
  assert.equal(state.calls[1].frames[0].clipPath, state.current.clipPath);
  assert.equal(state.calls[1].frames[0].opacity, state.current.opacity);
  assert.equal(state.calls[1].options.duration, 240);
  assert.equal(state.calls[1].frames[1].opacity, 0.9);
  assert.equal(state.collapsed(), true);
  assert.equal(state.slot.pinned, false);
  assert.equal(state.slot.dismissed, true);
  assert.equal(state.viewer.open, false);
});

test("reduced motion closes directly without starting an animation", async () => {
  const state = setup();
  state.motion.matches = true;
  await state.hero.closeViewer();
  assert.equal(state.calls.length, 0);
  assert.equal(state.collapsed(), true);
  assert.equal(state.viewer.open, false);
});
