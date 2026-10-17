// Builds an isolated copy with fixture articles; never publishes or changes real drafts.
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, preview } from "astro";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
await mkdir(join(root, ".astro"), { recursive: true });
const fixtureRoot = await mkdtemp(join(root, ".astro/i18n-"));
const config = { root, srcDir: join(fixtureRoot, "src"), outDir: join(fixtureRoot, "dist"), cacheDir: join(fixtureRoot, "cache"), logLevel: "warn" };
let server;
let browser;
try {
  await cp(join(root, "src"), join(fixtureRoot, "src"), { recursive: true });
  const schemaFile = join(fixtureRoot, "src/content.config.ts");
  const schema = await readFile(schemaFile, "utf8");
  await writeFile(schemaFile, schema.replace("'./src/content/blog'", JSON.stringify(join(fixtureRoot, "src/content/blog"))));
  await cp(join(root, "tests/fixtures/blog"), join(fixtureRoot, "src/content/blog"), { recursive: true });
  await build(config);
  const sitemap = await readFile(join(fixtureRoot, "dist/sitemap-0.xml"), "utf8");
  assert.ok(sitemap.includes("/fr/blog/bilingual/"));
  assert.ok(!sitemap.includes("/fr/blog/english-only/"), "Fallback copies must not enter the sitemap");
  const frenchFeed = await readFile(join(fixtureRoot, "dist/fr/rss.xml"), "utf8");
  assert.ok(frenchFeed.includes("Un article en deux langues"));
  assert.ok(!frenchFeed.includes("English-only") && !frenchFeed.includes("brouillon"));
  server = await preview({ ...config, logLevel: "silent", server: { host: "127.0.0.1", port: 0 } });
  browser = await chromium.launch();
  const base = `http://127.0.0.1:${server.port}`;
  for (const width of [320, 375, 767, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: width < 768 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/");
    await page.waitForFunction(() => document.documentElement.dataset.loaderState === "dismissed" && !document.querySelector("boot-loader"));
    await page.evaluate(() => { window.__i18nSentinel = 42; localStorage.setItem("theme", "light"); });
    const switchLanguage = async (lang) => {
      if (await page.locator("nav-bar").count() && width < 768) {
        if (!(await page.locator("#mobile-nav").isVisible())) await page.locator(".nav-burger").click();
      }
      await page.locator("[data-language-toggle]:visible").first().click();
      await page.locator(`[data-language-switch][hreflang="${lang}"]:visible`).first().click();
      await page.waitForFunction((lang) => document.documentElement.lang === lang, lang);
      await page.waitForFunction(() => !document.documentElement.classList.contains("route-transitioning"));
      assert.equal(await page.evaluate(() => window.__i18nSentinel), 42, "Switch must keep the JavaScript document alive");
      assert.equal(await page.locator("boot-loader").count(), 0, "Language changes skip the boot loader");
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains("loader-scroll-lock")), false);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal overflow");
    };
    await switchLanguage("fr");
    assert.match(await page.locator("#about").innerText(), /Je suis ingénieur logiciel/);
    assert.equal(await page.locator('meta[property="og:locale"]').getAttribute("content"), "fr_FR");
    assert.ok(await page.locator("html").evaluate((el) => el.classList.contains("light")));
    if (width < 768) {
      assert.equal(await page.locator("#mobile-nav").isVisible(), false);
      await page.locator(".nav-burger").click();
      await page.screenshot({ path: `/tmp/portfolio-i18n-mobile-${width}.png` });
      await page.locator(".nav-burger").click();
    } else await page.screenshot({ path: "/tmp/portfolio-i18n-desktop.png" });
    await switchLanguage("en");
    await switchLanguage("fr");
    await page.locator("[data-blog-link]:visible").click();
    await page.waitForURL("**/fr/blog/");
    assert.equal(await page.locator(".blog-card").count(), 2);
    assert.equal(await page.locator(".language-badge").innerText(), "En anglais");
    await page.locator('a[href="/fr/blog/bilingual/"]').first().click();
    await page.waitForURL("**/fr/blog/bilingual/");
    await page.waitForFunction(() => !document.querySelector("boot-loader"));
    assert.equal(await page.locator("h1").innerText(), "Un article en deux langues");
    assert.equal(await page.locator(".translation-notice").count(), 0);
    assert.ok((await page.locator('link[hreflang="fr"]').getAttribute("href")).endsWith("/fr/blog/bilingual/"));
    await page.evaluate(() => { location.hash = "un-autre-titre"; });
    await switchLanguage("en");
    assert.equal(await page.locator("h1").innerText(), "An article in two languages");
    assert.equal(new URL(page.url()).hash, "", "Missing translated heading anchors are removed");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await switchLanguage("fr");
    await page.locator('a[href="/fr/blog/english-only/"]').last().click();
    await page.waitForURL("**/fr/blog/english-only/");
    await page.waitForFunction(() => !document.querySelector("boot-loader"));
    assert.match(await page.locator(".translation-notice").innerText(), /La version anglaise est affichée/);
    assert.equal(await page.locator("h1").getAttribute("lang"), "en");
    assert.ok((await page.locator('link[rel="canonical"]').getAttribute("href")).endsWith("/blog/english-only/"));
    assert.equal(await page.locator('link[hreflang="fr"]').count(), 0);
    await switchLanguage("en");
    assert.equal(await page.locator(".translation-notice").count(), 0);
    await page.goBack();
    await page.waitForFunction(() => document.documentElement.lang === "fr");
    assert.match(await page.locator(".translation-notice").innerText(), /La version anglaise/);
    assert.equal(await page.evaluate(() => window.__i18nSentinel), 42);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Language browser checks passed at ${width}px.`);
  }
} finally {
  await browser?.close();
  await server?.stop();
  await rm(fixtureRoot, { recursive: true, force: true });
}
