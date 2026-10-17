# Languages and article translations

English uses `/`, `/blog/`, and `/blog/article/`. French uses `/fr/`, `/fr/blog/`, and `/fr/blog/article/`. The language switch keeps the current page. A French article route displays the English original with a notice until a French translation is published.

## Translate an article

Existing Markdown and MDX files remain English by default. Keep the original file and URL. For an existing `src/content/blog/designing-data-paths/index.mdx`, add `index.fr.mdx` alongside it with:

```yaml
---
lang: fr
translationKey: designing-data-paths
title: Concevoir les chemins de données
description: Votre description en français.
pubDate: 2026-10-17
tags: [Architecture]
draft: true
---
```

Use the English article's existing ID as `translationKey`. For a new article, you can give both files the same explicit `translationKey`. It becomes the stable public slug; filenames do not need to match. Keep technical tags consistent across translations, and translate the title, description, image alt text, and body. Images can stay alongside the files and use the same relative paths.

Set `draft: false` when the translation is ready. A draft French version does not replace published English content. Duplicate files for the same article and language fail validation. Development previews include drafts, while production builds exclude them.

The French listing shows each article once, using its French translation or an English-labelled fallback. French RSS includes actual French translations only. Fallback pages use the original English canonical URL and are excluded from the sitemap and French language alternates.

## Interface copy

English source strings and their French translations live in `src/config/i18n.ts`. Portfolio identity and structured data remain in their existing config files. Add new user-facing strings to the dictionary and translate both rendered labels and interactive feedback.

Run `node --test tests/i18n.test.mjs` for language and article-selection checks. Run `node tests/i18n.browser.mjs` for a separate fixture build and browser checks; it does not publish the real draft articles.
