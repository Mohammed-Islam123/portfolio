import type { Locale } from "./i18n.ts";

export interface ArticleVersion {
  id: string;
  data: { lang?: Locale; translationKey?: string; draft?: boolean; pubDate: Date };
}

export function articleKey(post: ArticleVersion): string {
  return post.data.translationKey ?? post.id;
}

export function selectArticles<T extends ArticleVersion>(posts: T[], locale: Locale, includeDrafts = false): T[] {
  const groups = new Map<string, Map<Locale, T>>();
  const seen = new Set<string>();
  for (const post of posts) {
    const key = articleKey(post);
    const lang = post.data.lang ?? "en";
    const version = `${key}:${lang}`;
    if (seen.has(version)) throw new Error(`Duplicate article translation: ${version}`);
    seen.add(version);
    if (post.data.draft && !includeDrafts) continue;
    const group = groups.get(key) ?? new Map<Locale, T>();
    group.set(lang, post);
    groups.set(key, group);
  }
  return Array.from(groups.values())
    .map((group) => group.get(locale) ?? group.get("en"))
    .filter((post): post is T => post !== undefined)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
