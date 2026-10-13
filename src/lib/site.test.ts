import { describe, it, expect } from "vitest";
import { ayahAudioUrl } from "./audio";
import { SITE_URL, absoluteUrl, languageAlternates } from "./site";
import { locales, defaultLocale } from "@/i18n/config";

describe("ayahAudioUrl", () => {
  it("zero-pads surah and ayah to three digits", () => {
    expect(ayahAudioUrl(2, 255)).toMatch(/002255\.mp3$/);
    expect(ayahAudioUrl(114, 6)).toMatch(/114006\.mp3$/);
    expect(ayahAudioUrl(1, 1)).toMatch(/001001\.mp3$/);
  });

  it("points at the everyayah CDN", () => {
    expect(ayahAudioUrl(1, 1)).toContain("everyayah.com");
  });
});

describe("site URLs", () => {
  it("builds absolute locale URLs", () => {
    expect(absoluteUrl("ar", "quran/2")).toBe(`${SITE_URL}/ar/quran/2`);
    expect(absoluteUrl("en")).toBe(`${SITE_URL}/en`);
    expect(absoluteUrl("en", "/quran")).toBe(`${SITE_URL}/en/quran`);
  });

  it("produces an hreflang map for every locale plus x-default", () => {
    const map = languageAlternates("quran/2");
    for (const locale of locales) expect(map[locale]).toBe(absoluteUrl(locale, "quran/2"));
    expect(map["x-default"]).toBe(absoluteUrl(defaultLocale, "quran/2"));
  });
});
