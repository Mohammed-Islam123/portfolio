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
  const requests = [], images = [];
  class ElementStub extends EventTarget {
    dataset = {};
    children = [];
    attributes = {};
    className = "";
    offsetWidth = 120;
    offsetHeight = 90;
    style = { setProperty(name, value) { this[name] = value; } };
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name] ?? null; }
    querySelector(selector) { return this.children.find((child) => child.className === selector.slice(1)) ?? null; }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return { left: 100, top: 120, width: 120, height: 90 }; }
    blur() {}
  }
  class ImageStub extends ElementStub {
    complete = false;
    naturalWidth = 512;
    naturalHeight = 768;
    onload = null;
    onerror = null;
    constructor() { super(); images.push(this); }
    set src(value) { this.source = value; requests.push(value); }
    get src() { return this.source; }
    cloneNode() { const clone = new ImageStub(); clone.source = this.source; return clone; }
    emit(type) { this.dispatchEvent(new Event(type)); this["on" + type]?.(); }
  }
  class VideoStub extends ElementStub {}
  const content = new ElementStub();
  content.className = "journey-viewer-content";
  const viewer = Object.assign(new ElementStub(), {
    open: false,
    showModal() { this.open = true; },
    close() { this.open = false; this.dispatchEvent(new Event("close")); },
  });
  viewer.append(content);
  let Component, timer = 0;
  runInNewContext(outputText, {
    exports: {},
    require: () => ({ playSound() {} }),
    HTMLElement: ElementStub,
    HTMLImageElement: ImageStub,
    HTMLVideoElement: VideoStub,
    Image: ImageStub,
    window: { matchMedia: () => ({ matches: false }), setTimeout: () => ++timer, clearTimeout() {} },
    document: {
      hidden: false,
      documentElement: new ElementStub(),
      createElement(tag) { return tag === "img" ? new ImageStub() : tag === "video" ? new VideoStub() : new ElementStub(); },
    },
    customElements: { get: () => undefined, define: (_, component) => { Component = component; } },
    DOMMatrixReadOnly: class { a = 1; b = 0; },
    getComputedStyle: () => ({ transform: "none", opacity: "0.9" }),
    requestAnimationFrame: () => 1,
  });
  const hero = new Component();
  hero.querySelector = () => viewer;
  hero.render = () => {};
  hero.animateViewer = () => ({ cancel() {} });
  viewer.addEventListener("close", () => { hero.viewerSlot = null; });
  return { hero, viewer, content, requests, images };
}

test("focus restoration cannot re-expand the hidden source before viewer cleanup", () => {
  const { hero } = setup();
  const slot = hero.createSlot();
  hero.viewerSlot = slot;
  slot.dismissed = true;
  slot.card.dispatchEvent(new Event("focusin"));
  assert.equal(slot.focused, true);
  assert.equal(slot.dismissed, true);
  assert.equal(slot.card.dataset.expanded, "false");
});

test("a failed waiting photo is replaced instead of blocking its slot forever", async () => {
  const { hero, images } = setup();
  const broken = { type: "image", source: "/broken.webp", description: "Broken" };
  const working = { type: "image", source: "/working.webp", description: "Working" };
  hero.items = [broken, working];
  const slot = hero.createSlot();
  hero.slots = [slot];
  const loading = hero.setMedia(slot, broken);
  images.at(-1).emit("error");
  await loading;
  hero.tick(100);
  assert.equal(slot.media.source, working.source);
  assert.equal(images.at(-1).src, working.source);
});

test("cards and preloading use thumbnails; only opening fetches the original", async () => {
  const state = setup();
  const item = { type: "image", source: "/original.webp", thumbnail: "/thumbnail.webp", description: "Project photo" };
  const slot = state.hero.createSlot(0);
  const loading = state.hero.setMedia(slot, item);
  const cardImage = state.images.at(-1);
  assert.equal(cardImage.src, item.thumbnail);
  cardImage.emit("load");
  await loading;

  const preload = state.hero.preload(item);
  assert.equal(state.images.at(-1).src, item.thumbnail);
  state.images.at(-1).emit("load");
  await preload;
  assert.ok(!state.requests.includes(item.source));

  slot.face.dispatchEvent(new Event("click"));
  const original = state.images.at(-1);
  const expanded = state.content.children[0];
  assert.equal(original.src, item.source);
  assert.equal(expanded.src, item.thumbnail, "Keep the loaded preview until the original succeeds");
  original.emit("load");
  assert.equal(expanded.src, item.source);
});

test("an original-image error or viewer closure keeps the preview safe", async () => {
  const state = setup();
  const item = { type: "image", source: "/original.webp", thumbnail: "/thumbnail.webp", description: "Project photo" };
  const slot = state.hero.createSlot(0);
  const loading = state.hero.setMedia(slot, item);
  state.images.at(-1).emit("load");
  await loading;
  slot.face.dispatchEvent(new Event("click"));
  const original = state.images.at(-1);
  original.emit("error");
  assert.equal(state.content.children[0].src, item.thumbnail);
  state.viewer.close();
  assert.equal(original.onload, null, "A closed viewer must not retain the pending image callback");
});

test("captions appear only in the viewer and never persist onto an uncaptioned photo", async () => {
  const state = setup();
  const slot = state.hero.createSlot(0);
  const caption = "Our first competition <with the team>";
  for (const text of [caption, "", "   ", undefined]) {
    const loading = state.hero.setMedia(slot, {
      type: "image", source: "/photo.webp", description: "Competition photo", caption: text,
    });
    state.images.at(-1).emit("load");
    await loading;
    assert.equal(slot.face.children.length, 2, "Cards contain only media and its loading indicator");
    slot.face.dispatchEvent(new Event("click"));
    assert.equal(state.content.children[0].className, "journey-viewer-media");
    if (text === caption) {
      assert.equal(state.content.children.length, 2);
      assert.equal(state.content.children[1].className, "journey-viewer-caption");
      assert.equal(state.content.children[1].textContent, caption);
    } else {
      assert.equal(state.content.children.length, 1, "Empty captions leave no caption panel");
    }
    state.viewer.close();
  }
});
