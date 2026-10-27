import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPosts, articleHref } from "./blog";
import { useTranslations } from "../config/i18n";
import { siteConfig } from "../config/site";
import type { Locale } from "./i18n";

export async function feed(context: APIContext, locale: Locale) {
  if (!context.site) throw new Error("RSS requires a site URL in astro.config.mjs.");
  const t = useTranslations(locale);
  const posts = (await getPosts(locale)).filter((post) => post.data.lang === locale);
  return rss({
    title: `${siteConfig.fullName} — blog`,
    description: t("Backend notes — protocols, data paths, and the habits that keep systems honest."),
    site: context.site,
    items: posts.map((post) => ({ title: post.data.title, description: post.data.description, pubDate: post.data.pubDate, link: articleHref(locale, post) })),
    customData: `<language>${locale}</language>`,
  });
}
