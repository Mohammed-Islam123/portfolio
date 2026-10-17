export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

export function localeFromPath(path: string): Locale {
  return /^\/fr(?:\/|$)/.test(path) ? "fr" : "en";
}

export function unlocalizedPath(path: string): string {
  return path.replace(/^\/fr(?=\/|$)/, "") || "/";
}

export function localizedPath(locale: Locale, path = "/"): string {
  const base = unlocalizedPath(path);
  return locale === "fr" ? `/fr${base}` : base;
}
