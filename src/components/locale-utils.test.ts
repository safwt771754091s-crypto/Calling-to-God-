import { describe, it, expect } from "vitest";
import { localeHref, swapLocale, otherLocales } from "./locale-utils";
import { locales } from "@/i18n/config";

describe("localeHref", () => {
  it("prefixes a path with the locale", () => {
    expect(localeHref("ar", "/quran")).toBe("/ar/quran");
    expect(localeHref("zh", "/hadith/bukhari/1")).toBe("/zh/hadith/bukhari/1");
  });

  it("handles the root path without a trailing slash", () => {
    expect(localeHref("en", "/")).toBe("/en");
    expect(localeHref("ru", "/")).toBe("/ru");
  });
});

describe("swapLocale", () => {
  it("replaces an existing locale prefix", () => {
    expect(swapLocale("/en/quran/2", "ar")).toBe("/ar/quran/2");
    expect(swapLocale("/ja", "hi")).toBe("/hi");
  });

  it("prepends a locale when none is present", () => {
    expect(swapLocale("/quran", "zh")).toBe("/zh/quran");
  });
});

describe("otherLocales", () => {
  it("returns every locale except the current one, with metadata", () => {
    const others = otherLocales("en");
    expect(others.map((o) => o.code)).toEqual(locales.filter((l) => l !== "en"));
    expect(others.every((o) => o.nativeName && o.dir)).toBe(true);
  });
});
