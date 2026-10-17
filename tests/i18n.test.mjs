import assert from "node:assert/strict";
import test from "node:test";
import { localizedPath, localeFromPath, unlocalizedPath } from "../src/lib/i18n.ts";
import { articleKey, selectArticles } from "../src/lib/article-versions.ts";
import { french, useTranslations } from "../src/config/i18n.ts";
import { getSiteConfig } from "../src/config/site.ts";
import { projects } from "../src/config/projects.ts";
import { technologies } from "../src/config/technologies.ts";
import { toolGroups } from "../src/config/toolkit.ts";
import { portfolioCopy } from "../src/config/portfolio.ts";

const post = (id, lang = "en", translationKey = id, draft = false) => ({
  id, data: { lang, translationKey, draft, pubDate: new Date("2026-01-01") },
});

test("language URLs retain English paths and never accumulate French prefixes", () => {
  for (const path of ["/", "/blog/", "/blog/an-article/", "/blog/tags/c-sharp/", "/rss.xml"]) {
    const translated = localizedPath("fr", path);
    assert.equal(localeFromPath(translated), "fr");
    assert.equal(localizedPath("fr", translated), translated);
    assert.equal(localizedPath("en", translated), path);
  }
  assert.equal(localeFromPath("/french/"), "en");
  assert.equal(unlocalizedPath("/fr"), "/");
});

test("listings select one translation per article and fall back to English", () => {
  const en = post("stable-english-url");
  const fr = post("different-file.fr", "fr", en.id);
  const englishOnly = post("english-only");
  const all = [en, fr, englishOnly];
  assert.deepEqual(selectArticles(all, "en"), [en, englishOnly]);
  assert.deepEqual(selectArticles(all, "fr"), [fr, englishOnly]);
  assert.equal(articleKey(fr), en.id);
  assert.equal(articleKey({ id: "existing-file", data: {} }), "existing-file");
});

test("draft translations never replace published English or leak unpublished articles", () => {
  const en = post("article");
  const draft = post("article.fr", "fr", "article", true);
  const unpublished = post("not-published", "en", "not-published", true);
  assert.deepEqual(selectArticles([en, draft, unpublished], "fr"), [en]);
  assert.deepEqual(selectArticles([en, draft], "fr", true), [draft]);
});

test("duplicate translations fail instead of silently selecting a file", () => {
  assert.throws(() => selectArticles([post("one"), post("two", "en", "one")], "en"), /Duplicate article translation: one:en/);
});

test("portfolio descriptions and toolkit notes all have French translations", () => {
  const source = [portfolioCopy.bio, ...projects.map((p) => p.description), ...Object.values(technologies).flatMap((t) => t.description ? [t.description] : []), ...toolGroups.map((g) => g.label)];
  for (const text of source) assert.ok(Object.hasOwn(french, text), `Missing French copy: ${text}`);
  assert.equal(useTranslations("en")("Read more"), "Read more");
  assert.equal(useTranslations("fr")("Read more"), "Lire la suite");
});

test("French contact links use French messages and keep platform destinations", () => {
  const config = getSiteConfig("fr");
  assert.match(decodeURIComponent(config.contactPlatforms.find((p) => p.id === "whatsapp").href), /Bonjour Mohamed Islam/);
  assert.match(decodeURIComponent(config.contactPlatforms.find((p) => p.id === "email").href), /Opportunité de collaboration/);
  assert.equal(config.socialProfiles.find((p) => p.icon === "portfolio").href, "/fr/");
});
