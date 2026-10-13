import { locales, localeMeta, type Locale } from "@/i18n/config";

export function localeHref(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path;
  return `/${locale}${clean}`;
}

export function swapLocale(pathname: string, next: Locale): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length && (locales as readonly string[]).includes(parts[0])) {
    parts[0] = next;
  } else {
    parts.unshift(next);
  }
  return "/" + parts.join("/");
}

export function otherLocales(current: Locale) {
  return locales
    .filter((l) => l !== current)
    .map((l) => ({ code: l, ...localeMeta[l] }));
}
