import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { defaultSoundVolume } from "../src/config/sound.ts";

const compile = async (path) => ts.transpileModule(await readFile(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const engineCode = await compile("../src/lib/sound.ts");
const controllerCode = await compile("../src/scripts/sound-init.ts");
const flush = () => new Promise(setImmediate);

function setup({ stored = {}, supported = true, reduced = false, constructorFails = false } = {}) {
  const contexts = [];
  const parameter = () => ({
    value: 1, events: [],
    setValueAtTime(value, time) { this.events.push({ value, time }); },
    exponentialRampToValueAtTime(value, time) { this.events.push({ value, time }); },
    setTargetAtTime(value, time) { this.events.push({ value, time }); },
  });
  const node = () => ({ connect() {}, disconnect() { this.disconnected = true; } });
  class AudioContext {
    state = "running";
    currentTime = 10;
    sampleRate = 48000;
    destination = {};
    gains = [];
    sources = [];
    resumes = 0;
    buffers = 0;
    constructor() {
      if (constructorFails) throw new Error("Audio unavailable");
      contexts.push(this);
    }
    createGain() {
      const gain = Object.assign(node(), { gain: parameter() });
      this.gains.push(gain);
      return gain;
    }
    createOscillator() {
      const source = Object.assign(node(), {
        frequency: parameter(),
        start(time) { this.started = time; }, stop(time) { this.stopped = time; },
      });
      this.sources.push(source);
      return source;
    }
    createBufferSource() { return this.createOscillator(); }
    createBiquadFilter() { return Object.assign(node(), { frequency: parameter(), Q: parameter() }); }
    createBuffer(_channels, length) { this.buffers++; return { getChannelData: () => new Float32Array(length) }; }
    resume() {
      this.resumes++;
      if (this.rejectResume) return Promise.reject(new Error("Audio still interrupted"));
      if (this.deferResume) return new Promise((resolve) => { this.finishResume = () => { this.state = "running"; resolve(); }; });
      this.state = "running";
      return Promise.resolve();
    }
    close() { this.state = "closed"; return Promise.resolve(); }
  }
  const window = Object.assign(new EventTarget(), {
    ...(supported ? { AudioContext } : {}),
    matchMedia: () => ({ matches: reduced }),
  });
  const engine = {};
  runInNewContext(engineCode, { exports: engine, window });
  const storage = new Map(Object.entries(stored));
  const api = {};
  runInNewContext(controllerCode, {
    exports: api, window, CustomEvent,
    require: (path) => path.includes("config/sound") ? { defaultSoundVolume } : engine,
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  });
  return { api, engine, contexts, storage, window,
    arm: () => window.dispatchEvent(new Event("pointerdown")),
    allowConstruction: () => { constructorFails = false; },
  };
}

test("audio stays lazy until a gesture and uses the configured click envelope at 50%", () => {
  const state = setup();
  assert.equal(state.api.getSoundVolume(), 50);
  assert.equal(state.api.isSoundOn(), true);
  state.api.playSound("hover");
  assert.equal(state.contexts.length, 0);
  state.window.dispatchEvent(new Event("click"));
  state.api.playSound("click");
  const ctx = state.contexts[0];
  const master = ctx.gains[0].gain.events.at(-1).value;
  const envelope = Math.max(...ctx.gains[1].gain.events.map(({ value }) => value));
  assert.equal(master * envelope, 0.16);
  assert.equal(ctx.sources[0].frequency.events[0].value, 660);
  assert.equal(ctx.sources[0].frequency.events[1].value, 440);
});

test("stored mute and volume survive initialization, while invalid values are ignored", () => {
  const state = setup({ stored: { "mi-sound": "off", "mi-sound-volume": "37" } });
  state.arm();
  assert.equal(state.api.getSoundVolume(), 37);
  assert.equal(state.api.isSoundOn(), false);
  assert.equal(state.contexts.length, 0);
  state.api.setSoundVolume(NaN);
  assert.equal(state.api.getSoundVolume(), 37);
  state.api.toggleSound();
  assert.equal(state.api.getSoundVolume(), 37);
  assert.equal(state.api.isSoundOn(), true);
  assert.equal(state.storage.get("mi-sound"), "on");
  state.api.setSoundVolume(0);
  state.api.toggleSound();
  assert.equal(state.api.getSoundVolume(), defaultSoundVolume);
});

test("audio support is independent of reduced motion and requires an audio API", () => {
  const state = setup({ reduced: true });
  assert.equal(state.api.isSoundCapableNow(), true);
  state.arm();
  state.api.playSound("click");
  assert.equal(state.contexts[0].sources.length, 1);
  const unavailable = setup({ supported: false });
  assert.equal(unavailable.api.isSoundCapableNow(), false);
  unavailable.api.toggleSound();
  assert.equal(unavailable.api.isSoundOn(), false);
});

test("interrupted playback shares one resume request and resumes without an unhandled rejection", async () => {
  const state = setup();
  state.arm();
  const ctx = state.contexts[0];
  ctx.state = "interrupted";
  ctx.deferResume = true;
  state.arm();
  state.api.playSound("click");
  state.api.playSound("toggle");
  assert.equal(ctx.resumes, 1);
  assert.equal(ctx.sources.length, 0);
  ctx.finishResume();
  await flush();
  assert.equal(ctx.sources.length, 2);
  ctx.sources.forEach((source) => source.onended());
  ctx.state = "interrupted";
  ctx.deferResume = false;
  ctx.rejectResume = true;
  state.api.playSound("click");
  await flush();
  assert.equal(ctx.sources.length, 2);
  ctx.rejectResume = false;
  state.arm();
  state.api.playSound("click");
  await flush();
  assert.equal(ctx.sources.length, 3);
});

test("muting during recovery suppresses a pending effect", async () => {
  const state = setup();
  state.arm();
  const ctx = state.contexts[0];
  ctx.state = "suspended";
  ctx.deferResume = true;
  state.api.playSound("click");
  state.api.setSoundVolume(0);
  ctx.finishResume();
  await flush();
  assert.equal(ctx.sources.length, 0);
});

test("a later gesture retries a resume that an earlier gesture could not unlock", async () => {
  const state = setup();
  state.arm();
  const ctx = state.contexts[0];
  ctx.state = "suspended";
  ctx.deferResume = true;
  state.arm();
  const finishFirst = ctx.finishResume;
  state.arm();
  assert.equal(ctx.resumes, 2);
  ctx.finishResume();
  finishFirst();
  await flush();
  state.api.playSound("click");
  assert.equal(ctx.sources.length, 1);
});

test("overlapping voices are bounded and ended nodes release their connections", () => {
  const state = setup();
  state.arm();
  for (let i = 0; i < 4; i++) state.api.playSound("click");
  const ctx = state.contexts[0];
  assert.equal(ctx.sources.length, 3);
  assert.ok(3 * 0.32 < 1);
  ctx.sources[0].onended();
  assert.equal(ctx.sources[0].disconnected, true);
  assert.equal(ctx.gains[1].disconnected, true);
  state.api.playSound("click");
  assert.equal(ctx.sources.length, 4);
});

test("hover feedback is rate limited and section noise reuses its buffer", () => {
  const state = setup();
  state.arm();
  const ctx = state.contexts[0];
  state.api.playSound("hover");
  ctx.currentTime += 0.04;
  state.api.playSound("hover");
  assert.equal(ctx.sources.length, 1);
  ctx.currentTime += 0.05;
  state.api.playSound("hover");
  assert.equal(ctx.sources.length, 2);
  ctx.sources.forEach((source) => source.onended());
  state.api.playSound("section");
  ctx.sources.at(-1).onended();
  state.api.playSound("section");
  assert.equal(ctx.buffers, 1);
});

test("a failed context constructor can recover on a later gesture", () => {
  const state = setup({ constructorFails: true });
  state.arm();
  assert.equal(state.contexts.length, 0);
  state.allowConstruction();
  state.arm();
  state.api.playSound("click");
  assert.equal(state.contexts[0].sources.length, 1);
});
