import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";

const STATIC_PATHS = ["", "quran", "hadith", "biography", "qa", "shahada", "search"];

function alternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[locale] = absoluteUrl(locale, path);
  return languages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  for (const path of STATIC_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(locale, path),
        lastModified: now,
        changeFrequency: path === "" ? "daily" : "weekly",
        priority: path === "" ? 1 : 0.8,
        alternates: { languages: alternates(path) },
      });
    }
  }

  for (let n = 1; n <= 114; n++) {
    const path = `quran/${n}`;
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(locale, path),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: { languages: alternates(path) },
      });
    }
  }

  return entries;
}
