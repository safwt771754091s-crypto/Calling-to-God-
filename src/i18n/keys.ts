import { locales, defaultLocale, type Locale } from "./config";
import { getDictionary } from "./get-dictionary";

/** Walk a nested dictionary and return dotted key paths. */
export function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" ? keyPaths(v as Record<string, unknown>, path) : [path];
  });
}

/** Resolve a dotted path against a nested object. */
export function valueAt(root: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, part) => (acc as Record<string, unknown> | undefined)?.[part],
      root,
    );
}

export interface LocaleReport {
  locale: Locale;
  /** Keys present in the reference locale but missing here. */
  missing: string[];
  /** Keys present here but absent from the reference locale. */
  extra: string[];
  /** Keys whose value is a blank string. */
  empty: string[];
  complete: boolean;
}

/**
 * Compare one locale's dictionary against the reference locale. Used by the
 * i18n audit CLI and the CI check so translation drift fails the build instead
 * of silently shipping a half-translated page.
 */
export function compareDictionary(
  locale: Locale,
  reference: Locale = defaultLocale,
): LocaleReport {
  const refKeys = keyPaths(getDictionary(reference) as unknown as Record<string, unknown>).sort();
  const dict = getDictionary(locale) as unknown as Record<string, unknown>;
  const keys = keyPaths(dict).sort();

  const missing = refKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !refKeys.includes(k));
  const empty = keys.filter((k) => {
    const v = valueAt(dict, k);
    return typeof v === "string" && v.trim() === "";
  });

  return {
    locale,
    missing,
    extra,
    empty,
    complete: missing.length === 0 && extra.length === 0 && empty.length === 0,
  };
}

/** Audit every locale against the reference; returns one report per locale. */
export function auditDictionaries(reference: Locale = defaultLocale): LocaleReport[] {
  return locales.map((l) => compareDictionary(l, reference));
}
