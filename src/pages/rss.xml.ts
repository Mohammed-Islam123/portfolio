/**
 * /rss.xml — RSS feed for the blog (the original MASTER.md spec called
 * for RSS; drafts excluded).
 */
import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPosts } from "../lib/blog";
import { siteConfig } from "../config/site";

export const GET: APIRoute = async (context) => {
  const posts = await getPosts();
  return rss({
    title: `${siteConfig.fullName} — blog`,
    description:
      "Backend notes — protocols, data paths, and the habits that keep systems honest.",
    site: context.site ?? "https://mohamedislam.dev",
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: `/blog/${p.id}/`,
    })),
    customData: "<language>en</language>",
  });
};
