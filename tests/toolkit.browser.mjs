// Run against the production build: node tests/toolkit.browser.mjs
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { preview } from "astro";
import { chromium } from "playwright";

const server = await preview({
  root: fileURLToPath(new URL("../", import.meta.url)),
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "silent",
});
let browser;
try {
  browser = await chromium.launch();
  for (const width of [320, 375, 767, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: width < 768 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.port}/`);
    await page.waitForFunction(() => document.documentElement.dataset.loaderState === "dismissed");
    const toolkit = page.locator("toolkit-grid");
    const area = toolkit.locator("[data-groups]");
    const filter = (id) => toolkit.locator(`[data-filter="${id}"]`);
    const visibleGroups = () => toolkit.locator("[data-group]:visible").count();
    assert.equal(await toolkit.locator("[data-filter]").count(), 9);

    if (width < 768) {
      assert.equal(await filter("backend").getAttribute("aria-pressed"), "true");
      assert.equal(await visibleGroups(), 1);
      assert.ok(await area.evaluate((el) => el.clientHeight < 300));
      await filter("all").click();
      assert.equal(await visibleGroups(), 8);
      assert.ok(await area.evaluate((el) => getComputedStyle(el).maxHeight === "none" && getComputedStyle(el).overflowY === "visible"));
      assert.ok(await area.evaluate((el) => el.clientHeight > 1000), "All categories stay in the page flow");
      await toolkit.locator('[data-group="ai-tools"]').scrollIntoViewIfNeeded();
      assert.equal(await filter("all").getAttribute("aria-pressed"), "true");
      await filter("backend").click();
      assert.equal(await visibleGroups(), 1);
      const noteCell = toolkit.locator('[data-group="backend"] [data-cell][aria-expanded]').last();
      await noteCell.click();
      assert.equal(await noteCell.getAttribute("aria-expanded"), "true");
      const panel = toolkit.locator("[data-tk-cell].is-open .note-panel");
      assert.ok(await panel.evaluate((el) => {
        const note = el.getBoundingClientRect();
        const viewport = el.closest("[data-groups]").getBoundingClientRect();
        return note.left >= viewport.left && note.right <= viewport.right && note.bottom <= viewport.bottom;
      }), "Last-row note must fit inside its container");
      await filter("frontend").click();
      assert.equal(await noteCell.getAttribute("aria-expanded"), "false");
      assert.equal(await toolkit.locator('[data-group="frontend"]').isVisible(), true);

      for (const [id, expected] of [["robotics-iot", "translateY(24px)"], ["backend", "translateY(-24px)"]]) {
        const firstFrame = await toolkit.evaluate((el, id) => {
          el.querySelector(`[data-filter="${id}"]`).click();
          return el.querySelector("[data-groups]").getAnimations()[0]?.effect.getKeyframes()[0].transform;
        }, id);
        assert.equal(firstFrame, expected);
      }

      await page.emulateMedia({ reducedMotion: "reduce" });
      await filter("all").click();
      assert.equal(await area.evaluate((el) => el.getAnimations().length), 0);
      await page.emulateMedia({ reducedMotion: "no-preference" });

      // Reconnecting the same element must not accumulate toggle listeners.
      await toolkit.evaluate((el) => { const parent = el.parentNode; el.remove(); parent.append(el); });
      await noteCell.click();
      assert.equal(await noteCell.getAttribute("aria-expanded"), "true");
    } else {
      assert.equal(await filter("all").getAttribute("aria-pressed"), "true");
      assert.equal(await visibleGroups(), 8);
      await filter("backend").click();
      assert.equal(await visibleGroups(), 8);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-group="frontend"]')).opacity === "0.25");
      assert.equal(await toolkit.locator('[data-group="frontend"]').evaluate((el) => getComputedStyle(el).opacity), "0.25");
      assert.equal(await area.evaluate((el) => el.getAnimations().length), 0);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal page overflow");
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("Toolkit browser checks passed at 320, 375, 767 and 1280px.");
} finally {
  await browser?.close();
  await server.stop();
}
