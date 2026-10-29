import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/components/SoundVolume.astro", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source.match(/<script>([\s\S]*?)<\/script>/)[1], {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});

function setup(direction = "ltr") {
  let Component, component, muted = 0, reads = 0, enabled = true, volume = 50;
  const window = Object.assign(new EventTarget(), { innerWidth: 390 });
  const document = Object.assign(new EventTarget(), { documentElement: { lang: "en" }, activeElement: null });
  class Element extends EventTarget {
    dataset = { open: "false" };
    style = { setProperty(name, value) { this[name] = value; } };
    attributes = {};
    offsetWidth = 272;
    setAttribute(name, value) { this.attributes[name] = value; }
    focus() {
      document.activeElement = this;
      const event = new Event("focusin");
      Object.defineProperty(event, "target", { value: this });
      component.dispatchEvent(event);
    }
    blur() { document.activeElement = null; }
    matches() { return false; }
    contains(node) { return node === this || Object.values(elements).includes(node); }
    querySelector(selector) { return elements[selector]; }
    getBoundingClientRect() { reads++; return { left: 320, right: 366 }; }
  }
  const elements = Object.fromEntries([".sv-button", ".sv-range", ".sv-mute", ".sv-value", ".sv-controls"].map((name) => [name, new Element()]));
  const broadcast = () => window.dispatchEvent(new Event("mi-sound-change"));
  runInNewContext(outputText, {
    HTMLElement: Element, window, document,
    getComputedStyle: () => ({ direction }),
    require: (path) => path.includes("i18n") ? { useTranslations: () => (key) => key } : {
      getSoundVolume: () => volume, isSoundOn: () => enabled, isSoundCapableNow: () => true,
      SOUND_SYNC_EVENT: "mi-sound-change", playSound() {},
      toggleSound() { muted++; enabled = !enabled; broadcast(); },
      setSoundVolume(value) { volume = value; enabled = value > 0; broadcast(); },
    },
    exports: {}, customElements: { get() {}, define(_, value) { Component = value; } },
  });
  component = new Component();
  component.connectedCallback();
  return { component, elements, window, document, reads: () => reads, muted: () => muted,
    open() { elements[".sv-button"].dispatchEvent(new Event("click")); },
  };
}

test("opening the volume panel preserves mute/level and the separate mute button synchronizes", () => {
  const state = setup();
  const { component, elements } = state;
  assert.equal(elements[".sv-controls"].inert, true);
  state.open();
  assert.equal(component.dataset.open, "true");
  assert.equal(state.muted(), 0);
  assert.equal(elements[".sv-range"].value, "50");
  assert.equal(elements[".sv-controls"].inert, false);
  elements[".sv-mute"].dispatchEvent(new Event("click"));
  assert.equal(state.muted(), 1);
  assert.equal(component.dataset.on, "false");
  assert.equal(elements[".sv-mute"].attributes["aria-label"], "Turn site sound effects on");
  state.open();
  assert.equal(elements[".sv-controls"].inert, true);
});

test("panel placement stays inside the viewport in both text directions", () => {
  for (const direction of ["ltr", "rtl"]) {
    const state = setup(direction);
    state.open();
    const offset = parseFloat(state.elements[".sv-controls"].style["--sv-panel-start"]);
    const left = direction === "ltr" ? 320 + offset : 366 - offset - 272;
    assert.ok(left >= 12 && left + 272 <= 378);
  }
});

test("Escape returns focus to the trigger without reopening the panel; disconnect removes handlers", () => {
  const state = setup();
  state.open();
  state.elements[".sv-range"].focus();
  const event = Object.assign(new Event("keydown"), { key: "Escape" });
  Object.defineProperty(event, "target", { value: state.elements[".sv-range"] });
  state.document.dispatchEvent(event);
  assert.equal(state.document.activeElement, state.elements[".sv-button"]);
  assert.equal(state.component.dataset.open, "false");
  state.open();
  state.component.disconnectedCallback();
  const reads = state.reads();
  state.window.dispatchEvent(new Event("resize"));
  state.elements[".sv-mute"].dispatchEvent(new Event("click"));
  assert.equal(state.reads(), reads);
  assert.equal(state.muted(), 0);
});
