import { locales, defaultLocale, type Locale } from "@/i18n/config";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://work-1-rmzjviikgmvmxyqz.prod-runtime.all-hands.dev";

export const SITE_NAME = "The True Path Islam";

/** Absolute URL for a locale-scoped path (path is locale-less, e.g. "quran/2"). */
export function absoluteUrl(locale: Locale, path = ""): string {
  const clean = path.replace(/^\/+/, "");
  return `${SITE_URL}/${locale}${clean ? `/${clean}` : ""}`;
}

/** hreflang alternates for a locale-less path, including x-default. */
export function languageAlternates(path = ""): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[locale] = absoluteUrl(locale, path);
  languages["x-default"] = absoluteUrl(defaultLocale, path);
  return languages;
}
