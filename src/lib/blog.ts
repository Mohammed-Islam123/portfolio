/**
 * Blog helpers — reading time, sorting, tag extraction.
 */
import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

export type Tag = {
  name: string;
  slug: string;
  count: number;
};

function words(body: string): number {
  return body.trim().split(/\s+/).filter(Boolean).length;
}

/** ~200 wpm is a concise, conventional estimate for technical writing. */
export function readingTimeMinutes(body: string): number {
  return Math.max(1, Math.round(words(body) / 200));
}

export function wordCount(body: string): number {
  return words(body);
}

/**
 * A single URL-safe representation for every tag route. The explicit
 * substitutions keep common technical tags such as C# and C++ legible.
 */
export function tagSlug(tag: string): string {
  const slug = tag
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/#/g, " sharp ")
    .replace(/\+/g, " plus ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) throw new Error(`Tag \"${tag}\" cannot produce a URL slug.`);
  return slug;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** all non-draft posts, newest first (drafts stay viewable in dev) */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

/** Unique tags, ordered by frequency (descending) then name. */
export function collectTags(posts: Post[]): Tag[] {
  const tags = new Map<string, Tag>();
  for (const p of posts) {
    for (const name of p.data.tags) {
      const slug = tagSlug(name);
      const existing = tags.get(slug);
      if (existing && existing.name.localeCompare(name, undefined, { sensitivity: "accent" }) !== 0) {
        throw new Error(`Tags \"${existing.name}\" and \"${name}\" share the URL slug \"${slug}\".`);
      }
      tags.set(slug, {
        name: existing?.name ?? name,
        slug,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }
  return Array.from(tags.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

export function postsForTag(posts: Post[], slug: string): Post[] {
  return posts.filter((post) => post.data.tags.some((tag) => tagSlug(tag) === slug));
}

export function getRelatedPosts(current: Post, posts: Post[], limit = 3): Post[] {
  const currentTags = new Set(current.data.tags.map(tagSlug));
  return posts
    .filter((post) => post.id !== current.id)
    .map((post) => ({
      post,
      sharedTags: post.data.tags.reduce(
        (count, tag) => count + Number(currentTags.has(tagSlug(tag))),
        0,
      ),
    }))
    .filter(({ sharedTags }) => sharedTags > 0)
    .sort(
      (a, b) =>
        b.sharedTags - a.sharedTags ||
        b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf(),
    )
    .slice(0, limit)
    .map(({ post }) => post);
}
