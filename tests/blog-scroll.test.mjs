import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const [smooth, article, progress, lenis] = await Promise.all([
  read("src/scripts/smooth-scroll.ts"), read("src/views/Article.astro"),
  read("src/components/ReadingProgress.astro"), read("node_modules/lenis/dist/lenis.mjs"),
]);
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const media = (matches) => Object.assign(new EventTarget(), { matches });

function setupScroll({ desktop = true, reduced = false } = {}) {
  const motion = media(reduced), pointer = media(desktop), instances = [];
  const targets = new Map(), nativeScrolls = [];
  const location = new URL("https://example.test/blog/postgresql-performance-tuning/");
  const history = {
    state: { index: 4, scrollX: 0, scrollY: 0 },
    replaceState(state, _, url) { this.state = state; location.href = new URL(url, location).href; },
  };
  class Element {
    constructor(pre = false, prevented = false) { this.pre = pre; this.prevented = prevented; }
    closest(selector) {
      return (selector.includes("pre") && this.pre || selector.includes("data-lenis-prevent") && this.prevented) ? this : null;
    }
    hasAttribute(name) { return name === "data-lenis-prevent" && this.prevented; }
  }
  class Lenis {
    isStopped = false;
    isLocked = false;
    scrolls = [];
    constructor(options) { this.options = options; instances.push(this); }
    destroy() { this.destroyed = true; }
    stop() { this.isStopped = true; }
    start() { this.isStopped = false; }
    scrollTo(target, options) {
      if (this.isStopped || this.isLocked) return;
      this.isLocked = Boolean(options.lock);
      this.scrolls.push(target.id);
    }
  }
  const window = Object.assign(new EventTarget(), {
    matchMedia: (query) => query.includes("reduced-motion") ? motion : pointer,
    location,
  });
  const exports = {};
  runInNewContext(transpile(smooth), {
    exports, require: () => ({ __esModule: true, default: Lenis }), window, Element, URL, history,
    document: { documentElement: { dataset: {} }, getElementById: (id) => targets.get(id) },
  });
  // Exercise the installed library's event handler with the application's actual options.
  const start = lenis.indexOf("onVirtualScroll = (data) => {");
  const handler = lenis.slice(start, lenis.indexOf("\n\t/**", start));
  const Handler = runInNewContext(`(class { ${handler} })`, { window, HTMLElement: Element });
  const wheel = ({ pre = false, prevented = false, deltaX = 0, deltaY = 120, shiftKey = false } = {}) => {
    const target = new Element(pre, prevented), root = new Element();
    let captured = false, destination;
    const instance = Object.assign(new Handler(), {
      options: { smoothWheel: true, overscroll: true, gestureOrientation: "vertical", ...instances.at(-1).options },
      emitter: { emit() {} }, rootElement: root, targetScroll: 1000,
      scrollTo(value) { destination = value; },
    });
    instance.onVirtualScroll({ deltaX, deltaY, event: {
      type: "wheel", target, shiftKey, cancelable: true,
      composedPath: () => [target, root], preventDefault() { captured = true; },
    } });
    return { captured, destination };
  };
  return { wheel, instances, motion, pointer, exports, history, location, nativeScrolls,
    click(id) {
      const target = { id, scrollIntoView(options) { nativeScrolls.push({ id, options }); } };
      targets.set(id, target);
      const link = { href: new URL("#" + id, location).href, hasAttribute: () => false };
      const event = Object.assign(new Event("click", { cancelable: true }), { button: 0 });
      Object.defineProperty(event, "target", { value: { closest: () => link } });
      window.dispatchEvent(event);
      return event;
    },
  };
}

test("a second anchor click redirects an unfinished scroll on the first attempt", () => {
  const ui = setupScroll();
  assert.equal(ui.click("first-section").defaultPrevented, true);
  ui.click("the-query-patterns-that-quietly-destroy-performance");
  assert.deepEqual(ui.instances[0].scrolls, ["first-section", "the-query-patterns-that-quietly-destroy-performance"]);
  assert.equal(ui.instances[0].isLocked, false);
  assert.equal(ui.location.pathname, "/blog/postgresql-performance-tuning/");
  assert.equal(ui.location.hash, "#the-query-patterns-that-quietly-destroy-performance");
  assert.equal(ui.history.state.index, 4);
});

test("native anchors preserve route state on touch devices and with reduced motion", () => {
  for (const options of [{ desktop: false }, { reduced: true }]) {
    const ui = setupScroll(options);
    ui.click("contact");
    assert.equal(ui.nativeScrolls[0].id, "contact");
    assert.equal(ui.nativeScrolls[0].options.behavior, options.reduced ? "auto" : "smooth");
    assert.equal(ui.history.state.index, 4);
  }
});

test("vertical wheel scrolling stays with Lenis over both prose and code, in both directions", () => {
  const ui = setupScroll();
  for (const deltaY of [120, -120]) {
    const expected = { captured: true, destination: 1000 + deltaY };
    assert.deepEqual(ui.wheel({ deltaY }), expected);
    assert.deepEqual(ui.wheel({ pre: true, deltaY }), expected);
  }
});

test("horizontal code gestures and explicit nested scroll containers stay native", () => {
  const ui = setupScroll();
  const native = { captured: false, destination: undefined };
  assert.deepEqual(ui.wheel({ pre: true, deltaX: 120, deltaY: 3 }), native);
  assert.deepEqual(ui.wheel({ pre: true, shiftKey: true }), native);
  assert.deepEqual(ui.wheel({ prevented: true }), native);
});

test("touch devices and reduced motion use native scrolling, including preference changes", () => {
  assert.equal(setupScroll({ desktop: false }).instances.length, 0);
  assert.equal(setupScroll({ reduced: true }).instances.length, 0);
  const ui = setupScroll();
  ui.motion.matches = true;
  ui.motion.dispatchEvent(new Event("change"));
  assert.equal(ui.instances[0].destroyed, true);
  assert.equal(ui.exports.getLenis(), null);
  ui.motion.matches = false;
  ui.motion.dispatchEvent(new Event("change"));
  assert.equal(ui.instances.length, 2);
  ui.pointer.matches = false;
  ui.pointer.dispatchEvent(new Event("change"));
  assert.equal(ui.instances[1].destroyed, true);
});

function setupComponent(source, { reduced = false } = {}) {
  let Component, nextFrame = 0;
  const motion = media(reduced), frames = new Map(), writes = [];
  const bar = { hidden: true, style: new Proxy({}, {
    set(style, key, value) { writes.push([key, value]); style[key] = value; return true; },
  }) };
  const window = Object.assign(new EventTarget(), { scrollY: 0, matchMedia: () => motion });
  const document = { documentElement: { scrollHeight: 2000, clientHeight: 1000 } };
  runInNewContext(transpile(source.match(/<script>([\s\S]*?)<\/script>/)[1]), {
    HTMLElement: class { querySelector() { return bar; } }, AbortController, window, document,
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    customElements: { get() {}, define(_, value) { Component = value; } },
  });
  const component = new Component();
  component.connectedCallback();
  const flush = () => {
    const callbacks = [...frames.values()]; frames.clear();
    callbacks.forEach((callback) => callback());
  };
  return { component, window, document, motion, bar, writes, frames, flush,
    scroll(y) { window.scrollY = y; window.dispatchEvent(new Event("scroll")); flush(); },
  };
}

test("hero blur fades over 360px, reverses, and stops writing after reaching full blur", () => {
  const ui = setupComponent(article);
  assert.equal(ui.bar.style.opacity, "0");
  ui.scroll(180);
  assert.equal(ui.bar.style.opacity, "0.5");
  ui.scroll(360);
  const count = ui.writes.length;
  for (const y of [1000, 2000, 1500]) ui.scroll(y);
  assert.equal(ui.writes.length, count);
  ui.scroll(180);
  assert.equal(ui.bar.style.opacity, "0.5");
  ui.scroll(-20);
  assert.equal(ui.bar.style.opacity, "0");
  assert.doesNotMatch(article, /backdrop-filter/);
  assert.match(article, /article-hero__image article-hero__blur/);
  assert.match(article, /filter: blur\(40px\)/);
});

test("progress uses a clamped transform, updates after resize, and resets on a short page", () => {
  const ui = setupComponent(progress);
  assert.equal(ui.bar.hidden, true);
  ui.scroll(500);
  assert.equal(ui.bar.style.transform, "scaleX(0.5)");
  assert.equal(ui.bar.hidden, false);
  ui.document.documentElement.clientHeight = 1500;
  ui.window.dispatchEvent(new Event("resize")); ui.flush();
  assert.equal(ui.bar.style.transform, "scaleX(1)");
  ui.scroll(5000);
  assert.equal(ui.bar.style.transform, "scaleX(1)");
  ui.scroll(-10);
  assert.equal(ui.bar.style.transform, "scaleX(0)");
  ui.scroll(250);
  ui.document.documentElement.scrollHeight = 1500;
  ui.window.dispatchEvent(new Event("resize")); ui.flush();
  assert.equal(ui.bar.style.transform, "scaleX(0)");
  assert.equal(ui.bar.hidden, true);
  assert.equal(ui.bar.style.width, undefined);
});

test("both effects coalesce frames, honor live reduced motion, and clean up on navigation", () => {
  for (const source of [article, progress]) {
    const ui = setupComponent(source);
    ui.window.scrollY = 180;
    ui.window.dispatchEvent(new Event("scroll"));
    ui.window.dispatchEvent(new Event("scroll"));
    assert.equal(ui.frames.size, 1);
    ui.motion.matches = true;
    ui.motion.dispatchEvent(new Event("change"));
    ui.flush();
    assert.equal(ui.bar.style.opacity ?? ui.bar.style.transform, source === article ? "0" : "scaleX(0)");
    ui.scroll(250);
    assert.equal(ui.frames.size, 0);
    ui.motion.matches = false;
    ui.motion.dispatchEvent(new Event("change"));
    ui.window.dispatchEvent(new Event("scroll"));
    ui.component.disconnectedCallback();
    assert.equal(ui.frames.size, 0);
    const count = ui.writes.length;
    ui.window.dispatchEvent(new Event("scroll"));
    ui.window.dispatchEvent(new Event("resize"));
    ui.motion.dispatchEvent(new Event("change"));
    ui.flush();
    assert.equal(ui.writes.length, count);
  }
});
