import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/components/LanguageSwitch.astro", import.meta.url), "utf8");
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
const { outputText } = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022 } });

function setup(width = 320, height = 844) {
  const window = Object.assign(new EventTarget(), { innerWidth: width, innerHeight: height });
  const attributes = {};
  let focused = false;
  const button = Object.assign(new EventTarget(), {
    setAttribute: (name, value) => { attributes[name] = value; },
    getBoundingClientRect: () => ({ right: width - 12, top: 12, bottom: 56 }),
    focus: () => { focused = true; },
  });
  const menu = Object.assign(new EventTarget(), { style: {}, children: [{}, {}], hidden: true });
  let Component;
  runInNewContext(outputText, {
    HTMLElement: class extends EventTarget {
      querySelector(selector) { return selector === "[data-language-menu]" ? menu : button; }
      contains() { return true; }
    },
    AbortController,
    window,
    customElements: { get: () => undefined, define: (_, component) => { Component = component; } },
  });
  const component = new Component();
  component.connectedCallback();
  const toggle = (open) => {
    menu.hidden = !open;
    attributes["aria-expanded"] = String(open);
    if (open) {
      component.positionMenu(button, menu);
    }
  };
  return { component, window, menu, attributes, toggle, focused: () => focused };
}

test("opening positions the menu within the mobile viewport and Escape returns focus", () => {
  const control = setup();
  control.toggle(true);
  assert.equal(control.attributes["aria-expanded"], "true");
  assert.equal(control.menu.hidden, false);
  assert.equal(control.menu.style.insetInlineStart, "116px");
  assert.equal(control.menu.style.insetBlockStart, "64px");
  control.component.dispatchEvent(Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" }));
  assert.equal(control.menu.hidden, true);
  assert.equal(control.attributes["aria-expanded"], "false");
  assert.equal(control.focused(), true);
});

test("reconnecting cleans listeners and resizing dismisses an open menu", () => {
  const control = setup(1280);
  control.component.disconnectedCallback();
  control.component.connectedCallback();
  control.toggle(true);
  control.window.dispatchEvent(new Event("resize"));
  assert.equal(control.menu.hidden, true);
  control.component.disconnectedCallback();
  control.toggle(true);
  control.window.dispatchEvent(new Event("resize"));
  assert.equal(control.menu.hidden, false, "Detached controls must not retain window listeners");
});

test("short viewports keep the menu above the viewport edge", () => {
  const control = setup(320, 120);
  control.toggle(true);
  assert.equal(control.menu.style.insetBlockStart, "8px");
});
