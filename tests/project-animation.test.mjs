import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/components/Projects.astro", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source.match(/<script>([\s\S]*?)<\/script>/)[1], {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});

function setup() {
  let Component, frameId = 0, timer = 0, sounds = 0;
  const frames = new Map(), timers = new Map(), animations = [];
  class Element extends EventTarget {
    style = { removeProperty(name) { delete this[name]; } };
    attributes = {};
    offsetHeight = 500;
    offsetWidth = 400;
    classList = { toggle() {} };
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    toggleAttribute(name, force) { if (force) this.attributes[name] = ""; else delete this.attributes[name]; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    contains() { return false; }
    getClientRects() { return [{}]; }
    animate() {
      const animation = {
        effect: { target: this }, playState: "running",
        commitStyles() { this.committed = true; },
        cancel() { this.cancelled = true; this.playState = "idle"; },
      };
      animations.push(animation);
      return animation;
    }
  }
  const cards = [new Element(), new Element()];
  const stage = new Element(), listScroll = new Element(), toggle = new Element(), arrow = new Element(), link = new Element();
  link.closest = (selector) => selector === "a" ? link : null;
  const motion = Object.assign(new EventTarget(), { matches: false });
  const window = Object.assign(new EventTarget(), {
    matchMedia: () => motion,
    setTimeout(callback) { timers.set(++timer, callback); return timer; },
    clearTimeout: (id) => timers.delete(id),
  });
  runInNewContext(outputText, {
    exports: {}, HTMLElement: Element, AbortController, window, queueMicrotask,
    document: Object.assign(new EventTarget(), { hidden: false, activeElement: null, documentElement: { lang: "en" } }),
    getComputedStyle: () => ({ minHeight: "504px" }),
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
    require: (path) => path.includes("i18n") ? { useTranslations: () => (key) => key } : { playSound() { sounds++; } },
    ResizeObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class { observe() {} disconnect() {} },
    customElements: { define(_, value) { Component = value; } },
  });
  const component = new Component();
  component.dataset = { count: "2", slugs: "one,two" };
  component.querySelectorAll = (selector) => ({ "[data-card]": cards, "[data-list-card]": [], a: [link] })[selector] ?? [];
  component.querySelector = (selector) => ({
    ".coverflow-stage": stage, '[data-arrow="right"]': arrow,
    "[data-carousel-view]": new Element(), "[data-list-view]": new Element(),
    "[data-list-scroll]": listScroll, "[data-view-toggle]": toggle,
  })[selector] ?? null;
  component.connectedCallback();
  return { component, cards, arrow, link, toggle, window, motion, animations, frames, sounds: () => sounds,
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback()); },
    enterCarousel() {
      toggle.dispatchEvent(new Event("click"));
      this.flush();
      toggle.dispatchEvent(new Event("click"));
      this.flush();
    },
  };
}

test("interacting during carousel entrance commits and cancels the old animation before moving", () => {
  const state = setup();
  state.enterCarousel();
  assert.equal(state.animations.length, 2);
  state.arrow.dispatchEvent(new Event("click"));
  assert.ok(state.animations.every((animation) => animation.committed && animation.cancelled));
  assert.equal(state.component.active, 1);
  assert.equal(state.cards[1].attributes["aria-hidden"], undefined);
});

test("rapid view switches cancel stale frame callbacks and live reduced motion cancels entrance", () => {
  const state = setup();
  state.toggle.dispatchEvent(new Event("click"));
  state.toggle.dispatchEvent(new Event("click"));
  assert.equal(state.frames.size, 1);
  state.flush();
  assert.equal(state.animations.length, 2);
  state.motion.matches = true;
  state.motion.dispatchEvent(new Event("change"));
  assert.ok(state.animations.every((animation) => animation.cancelled));
  assert.equal(state.cards[0].style.transition, "none");
});

test("action links play feedback once without also changing the active card", () => {
  const state = setup();
  state.link.dispatchEvent(new Event("click"));
  const event = new Event("click");
  Object.defineProperty(event, "target", { value: state.link });
  state.cards[1].dispatchEvent(event);
  assert.equal(state.sounds(), 1);
  assert.equal(state.component.active, 0);
  state.component.disconnectedCallback();
  state.link.dispatchEvent(new Event("click"));
  assert.equal(state.sounds(), 1);
});
