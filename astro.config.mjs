// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkUnwrapImages from 'remark-unwrap-images';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeMermaid from 'rehype-mermaid';
import { shikiDark, shikiLight } from './src/lib/shiki-themes';

/**
 * Astro has already passed fenced code through Shiki by the time rehype
 * plugins run. Re-mark Mermaid fences here so rehype-mermaid can replace
 * only those blocks with a static SVG, while all other languages remain
 * syntax-highlighted code.
 */
/** @param {any} node */
function tagMermaidBlock(node) {
  if (
    node.type === 'element' &&
    node.tagName === 'pre' &&
    (node.properties?.dataLanguage === 'mermaid' || node.properties?.['data-language'] === 'mermaid')
  ) {
    const className = node.properties.className;
    const classes = Array.isArray(className) ? className : typeof className === 'string' ? className.split(/\s+/) : [];
    node.properties.className = [...classes, 'mermaid'];
  }
  if ('children' in node && Array.isArray(node.children)) node.children.forEach(tagMermaidBlock);
}

/** @param {any} tree */
function transformMermaidBlocks(tree) {
  tagMermaidBlock(tree);
}

function markMermaidBlocks() {
  return transformMermaidBlocks;
}

// https://astro.build/config
export default defineConfig({
  site: 'https://mohamedislam.dev',
  integrations: [sitemap(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkUnwrapImages],
      rehypePlugins: [
        rehypeExternalLinks,
        markMermaidBlocks,
        [
          rehypeMermaid,
          {
            strategy: 'inline-svg',
            mermaidConfig: {
              theme: 'base',
              themeVariables: {
                background: 'transparent',
                primaryColor: '#7da7c9',
                primaryBorderColor: '#4f7899',
                primaryTextColor: '#181818',
                lineColor: '#6f8799',
                secondaryColor: '#d9b778',
                tertiaryColor: '#8ab9b3',
              },
              flowchart: { htmlLabels: false },
            },
          },
        ],
      ],
    }),
    shikiConfig: {
      // dual custom themes mapped to the site's --syn-* palette; the
      // active one is selected by the html.dark / html.light class via
      // CSS vars in global.css (defaultColor: false emits both as
      // --shiki-dark / --shiki-light per token)
      themes: { dark: shikiDark, light: shikiLight },
      defaultColor: false,
      wrap: false,
    },
  },
});
