/**
 * Content collections — the blog.
 *
 * Posts live in src/content/blog/ as .md or .mdx. Co-located images
 * (e.g. ./thumb.svg) resolve through the `image()` helper so they get
 * schema-checked + optimized by astro:assets.
 *
 * draft posts are excluded from production builds but stay viewable
 * in `astro dev` for preview.
 */
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** dek — the one-line subtitle under the title */
      description: z.string(),
      pubDate: z.coerce.date(),
      tags: z.array(z.string()).default([]),
      /** optional co-located cover image (16:10 works best) */
      thumbnail: image().optional(),
      thumbnailAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { blog };
