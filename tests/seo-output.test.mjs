// Run after the production build to check public metadata rather than source templates.
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const site = "https://mohislambenyahkem.dev";
const dist = new URL("../dist/", import.meta.url);
const files = (await readdir(dist, { recursive: true })).filter((path) => path.endsWith(".html"));
const pages = await Promise.all(files.map(async (path) => ({
  path,
  html: await readFile(new URL(path, dist), "utf8"),
})));
const canonical = (html) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const sitemap = await readFile(new URL("sitemap-0.xml", dist), "utf8");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

test("generated canonical, sitemap and feed URLs use the configured public origin", async () => {
  assert.ok(pages.length > 0);
  for (const { path, html } of pages) {
    assert.equal(new URL(canonical(html)).origin, site, path);
    assert.ok(!html.includes("https://mohamedislam.dev"), path);
  }
  assert.ok(locations.includes(site + "/"));
  assert.ok(locations.includes(site + "/fr/"));
  for (const url of locations) {
    assert.equal(new URL(url).origin, site);
    const page = pages.find(({ html }) => canonical(html) === url);
    assert.ok(page, url);
    assert.doesNotMatch(page.html, /<meta name="robots" content="[^"]*\bnoindex\b/);
  }
  assert.match(await readFile(new URL("sitemap-index.xml", dist), "utf8"), /https:\/\/mohislambenyahkem\.dev\/sitemap-0\.xml/);
  for (const path of ["rss.xml", "fr/rss.xml"]) {
    const xml = await readFile(new URL(path, dist), "utf8");
    assert.ok(xml.includes("<link>" + site + "/</link>"), path);
    assert.ok(!xml.includes("mohamedislam.dev"), path);
  }
  assert.ok((await readFile(new URL("robots.txt", dist), "utf8")).includes("Sitemap: " + site + "/sitemap-index.xml"));
});

test("error pages and empty archives are noindex and excluded from discovery", () => {
  for (const { path, html } of pages) {
    const isError = /(?:^|\/)404(?:\/index)?\.html$/.test(path);
    const isEmpty = /Nothing published yet\.|Aucun article publié pour le moment\.|No topics yet\.|Aucun thème pour le moment\./.test(html);
    if (!isError && !isEmpty) continue;
    assert.match(html, /<meta name="robots" content="noindex, follow"/, path);
    assert.ok(!locations.includes(canonical(html)), path);
    const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
    assert.doesNotMatch(head, /<link\b[^>]*\bhreflang=/, path);
  }
  assert.ok(!locations.some((url) => /\/404\/?$/.test(url)));
});

test("both homepages expose localized profiles, real portraits and reciprocal languages", async () => {
  for (const [path, locale] of [["index.html", "en"], ["fr/index.html", "fr"]]) {
    const { html } = pages.find((page) => page.path === path);
    const url = site + (locale === "fr" ? "/fr/" : "/");
    assert.equal(canonical(html), url);
    assert.ok(html.includes('hreflang="en" href="' + site + '/"'));
    assert.ok(html.includes('hreflang="fr" href="' + site + '/fr/"'));
    const profile = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(profile["@type"], "ProfilePage");
    assert.equal(profile.url, url);
    assert.equal(profile.inLanguage, locale);
    assert.equal(profile.mainEntity["@type"], "Person");
    assert.equal(profile.mainEntity["@id"], site + "/#person");
    assert.equal(profile.mainEntity.name, "Mohamed Islam Benyahkem");
    assert.ok(profile.mainEntity.sameAs.includes("https://github.com/Mohammed-Islam123"));
    const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
    assert.ok(description.includes("C#") && description.includes(".NET"));
    assert.ok(description.length < 200, "Homepage summary should remain concise");
    const image = new URL(html.match(/<meta property="og:image" content="([^"]+)"/)[1]);
    assert.equal(image.origin, site);
    await access(new URL("." + image.pathname, dist));
    assert.match(html, /src="\/portrait-about\.webp" width="300" height="300"/);
    assert.match(html, /src="\/portrait-hero\.webp" width="720" height="1469"/);
    assert.doesNotMatch(html, /<meta name="robots" content="[^"]*\bnoindex\b/);
  }
});
