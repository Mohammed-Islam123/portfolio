import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/components/Toolkit.astro", import.meta.url), "utf8");
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace('import { playSound } from "../scripts/sound-init";', "const playSound = () => {};");
const { outputText } = ts.transpileModule(script, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});

function setup({ mobile = false, reducedMotion = false, direction = "ltr" } = {}) {
  const element = (dataset = {}) => Object.assign(new EventTarget(), {
    dataset, style: {}, attributes: {}, hidden: false,
    classList: { toggle() {} },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  const buttons = ["all", "backend", "frontend"].map((filter) => element({ filter }));
  const groups = ["backend", "frontend"].map((group, index) => Object.assign(element({ group }), {
    offsetLeft: mobile ? 12 : 12 + index * 280,
    offsetTop: mobile ? 12 : 12 + index * 100,
    offsetWidth: 228, offsetHeight: 180 + index * 72,
  }));
  const indicator = element();
  const animations = [];
  const area = Object.assign(element(), {
    clientWidth: 900,
    animate(frames, options) {
      const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
      animations.push(animation);
      return animation;
    },
  });
  const viewport = Object.assign(new EventTarget(), { matches: mobile });
  const motion = Object.assign(new EventTarget(), { matches: reducedMotion });
  const window = Object.assign(new EventTarget(), {
    matchMedia: (query) => query.includes("reduced-motion") ? motion : viewport,
  });
  const document = Object.assign(new EventTarget(), { fonts: { ready: Promise.resolve() } });
  let Component, observer;
  runInNewContext(outputText, {
    HTMLElement: EventTarget, AbortController, window, document,
    getComputedStyle: () => ({ direction }),
    customElements: { define(_, component) { Component = component; } },
    ResizeObserver: class {
      constructor(callback) { observer = this; this.callback = callback; this.targets = []; }
      observe(target) { this.targets.push(target); }
      disconnect() { this.disconnected = true; }
    },
  });
  const toolkit = new Component();
  toolkit.querySelectorAll = (selector) => ({ "[data-filter]": buttons, "[data-group]": groups, "[data-cell]": [] })[selector];
  toolkit.querySelector = (selector) => ({ "[data-group-indicator]": indicator, "[data-groups]": area })[selector];
  toolkit.connectedCallback();
  return { toolkit, buttons, groups, indicator, area, animations, window, motion, observer,
    select(id) { buttons.find((button) => button.dataset.filter === id).dispatchEvent(new Event("click")); },
  };
}

test("frame follows the selected group, resizes with notes, and fades in place for all", () => {
  const ui = setup();
  assert.equal(ui.indicator.style.opacity, "0");
  ui.select("frontend");
  assert.deepEqual(ui.indicator.style, {
    opacity: "1", insetInlineStart: "280px", insetBlockStart: "100px", inlineSize: "252px", blockSize: "276px",
  });
  assert.equal(ui.buttons[2].attributes["aria-pressed"], "true");
  assert.equal(ui.buttons[0].attributes["aria-pressed"], "false");
  assert.ok(ui.groups.every((group) => !group.hidden));
  assert.equal(ui.animations.length, 0);
  assert.deepEqual(ui.observer.targets, [ui.area, ...ui.groups]);
  ui.groups[1].offsetHeight += 120;
  ui.observer.callback();
  assert.equal(ui.indicator.style.blockSize, "396px");
  ui.groups[1].offsetLeft = 420;
  ui.window.dispatchEvent(new Event("resize"));
  assert.equal(ui.indicator.style.insetInlineStart, "408px");
  ui.select("all");
  assert.equal(ui.indicator.style.opacity, "0");
  assert.equal(ui.indicator.style.insetInlineStart, "408px");
  ui.toolkit.disconnectedCallback();
});

test("mobile keeps filtering and directional animation; reduced motion and disconnect cancel it", () => {
  const ui = setup({ mobile: true });
  assert.equal(ui.buttons[1].attributes["aria-pressed"], "true");
  assert.equal(ui.indicator.style.insetInlineStart, "0px");
  assert.equal(ui.indicator.style.insetBlockStart, "0px");
  assert.equal(ui.groups[1].hidden, true);
  ui.select("frontend");
  assert.equal(ui.groups[0].hidden, true);
  assert.equal(ui.groups[1].hidden, false);
  assert.equal(ui.animations[0].frames[0].transform, "translateY(24px)");
  ui.motion.matches = true;
  ui.motion.dispatchEvent(new Event("change"));
  assert.equal(ui.animations[0].cancelled, true);
  ui.select("all");
  assert.equal(ui.animations.length, 1);
  assert.ok(ui.groups.every((group) => !group.hidden));
  ui.toolkit.disconnectedCallback();
  assert.equal(ui.observer.disconnected, true);
  ui.select("backend");
  assert.equal(ui.buttons[0].attributes["aria-pressed"], "true");
});

test("frame measures from the inline start in RTL layouts", () => {
  const ui = setup({ direction: "rtl" });
  ui.select("frontend");
  assert.equal(ui.indicator.style.insetInlineStart, "368px");
  ui.toolkit.disconnectedCallback();
});
