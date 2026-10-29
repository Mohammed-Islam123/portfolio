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
  let Component, random = 0, raf = 0, cancelled = 0;
  const motion = { matches: false };
  class Element extends EventTarget {
    dataset = {};
    style = {};
    offsetWidth = 130;
    append() {}
    setAttribute() {}
    remove() {}
  }
  runInNewContext(outputText, {
    exports: {}, HTMLElement: Element,
    require: () => ({ playSound() {} }),
    Math: Object.assign(Object.create(Math), { random: () => random }),
    window: { matchMedia: () => motion, clearTimeout() {} },
    document: { hidden: false, createElement: () => new Element() },
    customElements: { get() {}, define(_, value) { Component = value; } },
    requestAnimationFrame: () => ++raf,
    cancelAnimationFrame: () => { cancelled++; },
  });
  const hero = new Component();
  hero.render = () => {};
  const slot = () => {
    const value = hero.createSlot();
    value.media = { source: "/" + hero.slots.length + ".webp" };
    value.card.dataset.ready = "true";
    hero.slots.push(value);
    return value;
  };
  return { hero, slot, motion, random: (value) => { random = value; }, cancelled: () => cancelled };
}

test("launches are staggered, can favor one side, and re-roll their paths", () => {
  const { hero, slot, random } = setup();
  const slots = Array.from({ length: 6 }, slot);
  hero.tick(100);
  assert.equal(slots.filter((value) => value.progress >= 0).length, 1);
  for (let time = 150; time <= 3000; time += 50) hero.tick(time);
  assert.equal(slots.filter((value) => value.progress >= 0).length, 4);
  assert.equal(slots.filter((value) => value.progress >= 0 && value.side === -1).length, 3);
  const old = { side: slots[5].side, lane: slots[5].lane, bend: slots[5].bend };
  random(0.99);
  hero.planPath(slots[5]);
  assert.notDeepEqual({ side: slots[5].side, lane: slots[5].lane, bend: slots[5].bend }, old);
});

test("loading photos wait rather than consuming their travel time", () => {
  const { hero, slot } = setup();
  const value = slot();
  value.card.dataset.ready = "false";
  hero.tick(100);
  hero.tick(150);
  assert.ok(value.progress < 0);
  value.card.dataset.ready = "true";
  hero.tick(200);
  assert.equal(value.progress, 0);
});

test("selection avoids visible, reserved, and previous photos when alternatives exist", () => {
  const { hero, slot } = setup();
  hero.items = Array.from({ length: 10 }, (_, i) => ({ source: "/" + i + ".webp" }));
  const visible = slot();
  visible.next = hero.items[1];
  assert.equal(hero.choose(hero.items[2]).source, "/3.webp");
  hero.failed.add("/3.webp");
  assert.equal(hero.choose(hero.items[2]).source, "/4.webp");
});

test("resize-created slots load before initial preloading is enabled", () => {
  const { hero } = setup();
  hero.ready = true;
  hero.items = [{ source: "/photo.webp" }];
  let count = 2;
  hero.count = () => count;
  const loaded = [];
  hero.setMedia = (slot, media) => { slot.media = media; loaded.push(slot); return Promise.resolve(); };
  hero.layout();
  count = 6;
  hero.layout();
  assert.equal(hero.preloadEnabled, false);
  assert.equal(loaded.length, 6);
  assert.ok(hero.slots.every((slot) => slot.media));
});

test("a modal pauses the hero frame loop", () => {
  const { hero, cancelled } = setup();
  hero.ready = true;
  hero.visible = true;
  hero.frame = 5;
  hero.lastFrame = 1234;
  hero.viewerSlot = {};
  hero.syncActivity();
  assert.equal(cancelled(), 1);
  assert.equal(hero.frame, 0);
  assert.equal(hero.lastFrame, 0);
});

test("normal and hovered routes stay above the copy; geometry is cached between frames", () => {
  const { hero, slot } = setup();
  const value = slot();
  value.lane = 1;
  value.progress = 0.4;
  let reads = 0;
  hero.getBoundingClientRect = () => { reads++; return { left: 0, top: 0, width: 1200, height: 900 }; };
  hero.parentElement = {
    querySelector: (selector) => ({ getBoundingClientRect: () => selector === ".hero-copy"
      ? { top: 360 } : { left: 400, width: 400 } }),
  };
  delete hero.render;
  const y = () => Number(value.card.style.transform.match(/, ([\d.]+)px\)/)[1]);
  hero.render();
  assert.ok(y() + 130 * 0.375 <= 336);
  value.card.dataset.expanded = "true";
  hero.render();
  assert.ok(y() + 130 * 0.375 * 1.85 <= 336);
  assert.equal(reads, 1);
});
