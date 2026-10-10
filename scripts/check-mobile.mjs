// Run after npm run build: node scripts/check-mobile.mjs
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) throw new Error("Invalid path");
    if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
    res.setHeader("Content-Type", types[extname(path)] ?? "application/octet-stream");
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done, reject) => server.once("error", reject).listen(0, "127.0.0.1", done));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const url = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => {
    window.mobileCheck = { frames: [], animations: [] };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this === document.documentElement) window.mobileCheck.animations.push({ frames, options });
      return animate.call(this, frames, options);
    };
    new MutationObserver((records) => {
      const text = document.querySelector("scramble-name .sn-text");
      if (!text?.textContent || !records.some((r) => text.contains(r.target))) return;
      const rect = text.parentElement.getBoundingClientRect();
      window.mobileCheck.frames.push({ text: text.textContent, width: rect.width, height: rect.height, left: rect.left, right: rect.right });
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  const page = await context.newPage();
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(url);
    await page.waitForFunction(() => {
      const name = document.querySelector("scramble-name");
      return name?.querySelector(".sn-text")?.textContent === name?.getAttribute("aria-label");
    });
    const frames = await page.evaluate(() => window.mobileCheck.frames);
    const name = await page.locator("scramble-name").getAttribute("aria-label");
    assert(frames.length > 5, "Expected scramble frames");
    assert(frames.every((f) => [...name].every((letter, i) => letter !== " " || f.text[i] === " ")), "Scramble must preserve word spacing");
    assert(Math.max(...frames.map((f) => f.height)) - Math.min(...frames.map((f) => f.height)) < 1, "Name height changed during scramble");
    assert(Math.max(...frames.map((f) => f.width)) - Math.min(...frames.map((f) => f.width)) < 1, "Name width changed during scramble");
    assert(frames.every((f) => f.left >= 0 && f.right <= width), "Name exceeds mobile viewport");
    assert.equal(await page.locator("html").evaluate((el) => el.classList.contains("lenis")), false, "Mobile must use native scrolling");
  }

  const note = page.locator("[data-tk-cell].has-note [data-cell]").first();
  await note.tap();
  assert.equal(await note.getAttribute("aria-expanded"), "true");
  await page.locator("#toolkit h2").tap();
  assert.equal(await note.getAttribute("aria-expanded"), "false", "Outside tap must close note");
  await note.tap();
  await page.locator("[data-filter]").first().focus();
  assert.equal(await note.getAttribute("aria-expanded"), "false", "Focus loss must close note");
  await note.tap();
  await note.tap();
  assert.equal(await note.getAttribute("aria-expanded"), "false", "Second tap must close note");
  await page.waitForFunction(() => getComputedStyle(document.querySelector("[data-tk-cell].has-note .note-panel")).opacity === "0");

  const heights = await page.evaluate(async () => {
    const body = document.querySelectorAll("[data-mbody]")[1];
    document.querySelectorAll("[data-mvalue]")[1].click();
    const heights = [body.getBoundingClientRect().height];
    const start = performance.now();
    await new Promise((done) => {
      const sample = () => {
        heights.push(body.getBoundingClientRect().height);
        if (performance.now() - start < 400) requestAnimationFrame(sample);
        else done();
      };
      requestAnimationFrame(sample);
    });
    return heights;
  });
  assert(heights.at(-1) > 0 && heights.some((h) => h > 0 && h < heights.at(-1) - 1), "Note expansion must animate");
  assert.equal(await page.locator("[data-mvalue]").nth(1).getAttribute("aria-expanded"), "true");

  await page.locator(".nav-burger").tap();
  await page.locator(".nav-mobile-panel .theme-toggle-btn").tap();
  await page.waitForFunction(() => window.mobileCheck.animations.length > 0);
  const fade = await page.evaluate(() => window.mobileCheck.animations.at(-1));
  assert.deepEqual(fade.frames.opacity, [0, 1]);
  assert.equal(fade.frames.clipPath, undefined);
  assert.equal(fade.options.duration, 220);
  await page.locator(".nav-burger").tap();
  await page.setViewportSize({ width: 1024, height: 844 });
  assert.equal(await page.locator("html").evaluate((el) => el.classList.contains("lenis")), false, "Touch tablet must use native scrolling");

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(url);
  await desktopPage.waitForFunction(() => document.documentElement.dataset.loaderState === "dismissed");
  assert.equal(await desktopPage.locator("html").evaluate((el) => el.classList.contains("lenis")), true, "Desktop should retain Lenis");
  const desktopNote = desktopPage.locator("[data-tk-cell].has-note [data-cell]").first();
  await desktopNote.hover();
  await desktopPage.waitForFunction(() => getComputedStyle(document.querySelector("[data-tk-cell].has-note .note-panel")).opacity === "1");
  await desktopPage.emulateMedia({ reducedMotion: "reduce" });
  await desktopPage.waitForFunction(() => !document.documentElement.classList.contains("lenis"));
  const theme = desktopPage.locator(".nav-desktop .theme-toggle-btn");
  const before = await desktopPage.locator("html").getAttribute("class");
  await theme.evaluate((btn) => {
    const toggle = btn.parentElement;
    const parent = toggle.parentElement;
    toggle.remove();
    parent.append(toggle);
  });
  await theme.click();
  assert.notEqual(await desktopPage.locator("html").getAttribute("class"), before, "Reconnected toggle must switch exactly once");
  console.log("Mobile layout, native scrolling, note dismissal, accordion animation, theme fade, desktop hover, and reconnect checks passed.");
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
