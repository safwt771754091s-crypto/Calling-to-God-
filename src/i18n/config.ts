export const locales = ["en", "ar", "zh", "hi", "ja", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeMeta: Record<
  Locale,
  { name: string; nativeName: string; dir: "ltr" | "rtl"; flag: string }
> = {
  en: { name: "English", nativeName: "English", dir: "ltr", flag: "🇬🇧" },
  ar: { name: "Arabic", nativeName: "العربية", dir: "rtl", flag: "🇸🇦" },
  zh: { name: "Chinese", nativeName: "中文", dir: "ltr", flag: "🇨🇳" },
  hi: { name: "Hindi", nativeName: "हिन्दी", dir: "ltr", flag: "🇮🇳" },
  ja: { name: "Japanese", nativeName: "日本語", dir: "ltr", flag: "🇯🇵" },
  ru: { name: "Russian", nativeName: "Русский", dir: "ltr", flag: "🇷🇺" },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return localeMeta[locale].dir;
}
