import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/scripts/hero-journey.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});
let HeroJourney;
const motion = { matches: false };
runInNewContext(outputText, {
  exports: {},
  HTMLElement: class {},
  window: { matchMedia: () => motion },
  customElements: { get: () => undefined, define: (_, component) => { HeroJourney = component; } },
  getComputedStyle: () => ({ getPropertyValue: () => "cubic-bezier(0.16, 1, 0.3, 1)" }),
});

test("viewer animates from the clicked card and closes in half the time", async () => {
  const hero = new HeroJourney();
  const origin = { left: 100, top: 120, width: 120, height: 90 };
  let frames, options, reversed = false, closed = false, playbackRate;
  const animation = {
    playState: "running", finished: Promise.resolve(),
    reverse() { reversed = true; },
    updatePlaybackRate(rate) { playbackRate = rate; },
  };
  const viewer = {
    open: true,
    getBoundingClientRect: () => ({ left: 400, top: 200, width: 640, height: 480 }),
    animate(keyframes, settings) { frames = keyframes; options = settings; return animation; },
    close() { closed = true; },
  };
  hero.querySelector = () => viewer;
  hero.viewerSlot = { face: { getBoundingClientRect: () => origin } };
  hero.viewerAnimation = hero.animateViewer(origin);
  assert.equal(frames[0].transform, "translate(-560px, -275px)");
  assert.equal(frames[0].width, "120px");
  assert.equal(frames[0].height, "90px");
  assert.equal(frames[1].width, "640px");
  assert.equal(frames[1].height, "480px");
  assert.equal(frames[1].transform, "translate(0px, 0px)");
  assert.equal(options.duration, 480);
  await hero.closeViewer();
  assert.ok(reversed && closed);
  assert.equal(playbackRate, -2);

  hero.viewerClosing = false;
  animation.playState = "finished";
  await hero.closeViewer();
  assert.equal(options.direction, "reverse");
  assert.equal(options.duration, 240);

  hero.viewerClosing = false;
  reversed = false;
  motion.matches = true;
  await hero.closeViewer();
  assert.equal(reversed, false);
  motion.matches = false;
});
