import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/components/ArticleTools.astro", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source.match(/<script>([\s\S]*?)<\/script>/)[1], {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});

function setup({ desktop = true, reduced = false } = {}) {
  let Component, frame = 0;
  const frames = new Map(), smoothScrolls = [], nativeScrolls = [];
  const button = Object.assign(new EventTarget(), { hidden: true });
  const window = Object.assign(new EventTarget(), {
    scrollY: 0, matchMedia: () => ({ matches: reduced }), clearTimeout() {},
    scrollTo(options) { nativeScrolls.push(options); },
  });
  runInNewContext(outputText, {
    HTMLElement: class { querySelector() { return button; } }, AbortController,
    window, document: { documentElement: { lang: "en" }, querySelectorAll: () => [] },
    require: (path) => path.includes("i18n") ? { useTranslations: () => (key) => key } : {
      getLenis: () => desktop ? { scrollTo(target, options) { smoothScrolls.push({ target, options }); } } : null,
    },
    exports: {}, customElements: { get() {}, define(_, value) { Component = value; } },
    requestAnimationFrame(callback) { frames.set(++frame, callback); return frame; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  const component = new Component();
  component.connectedCallback();
  const flush = () => {
    const callbacks = [...frames.values()]; frames.clear();
    callbacks.forEach((callback) => callback());
  };
  return { component, button, window, frames, flush, smoothScrolls, nativeScrolls,
    scroll(y) { window.scrollY = y; window.dispatchEvent(new Event("scroll")); flush(); },
    click() { button.dispatchEvent(new Event("click")); },
  };
}

test("back-to-top appears after 640px and uses Lenis on desktop", () => {
  const ui = setup();
  assert.equal(ui.button.hidden, true);
  ui.scroll(639);
  assert.equal(ui.button.hidden, true);
  ui.scroll(640);
  assert.equal(ui.button.hidden, false);
  ui.click();
  assert.equal(ui.smoothScrolls[0].target, 0);
  assert.equal(ui.smoothScrolls[0].options.lock, undefined);
  assert.equal(ui.nativeScrolls.length, 0);
  ui.scroll(0);
  assert.equal(ui.button.hidden, true);
});

test("touch uses native smooth scrolling and reduced motion returns immediately", () => {
  for (const options of [{ desktop: false }, { reduced: true }]) {
    const ui = setup(options);
    ui.scroll(1000);
    ui.click();
    assert.equal(ui.nativeScrolls[0].top, 0);
    assert.equal(ui.nativeScrolls[0].behavior, options.reduced ? "auto" : "smooth");
    assert.equal(ui.smoothScrolls.length, 0);
  }
});

test("navigation removes listeners and cancels queued updates", () => {
  const ui = setup();
  ui.window.dispatchEvent(new Event("scroll"));
  ui.window.dispatchEvent(new Event("scroll"));
  assert.equal(ui.frames.size, 1);
  ui.component.disconnectedCallback();
  assert.equal(ui.frames.size, 0);
  ui.window.dispatchEvent(new Event("scroll"));
  ui.click();
  assert.equal(ui.frames.size, 0);
  assert.equal(ui.smoothScrolls.length, 0);
});
