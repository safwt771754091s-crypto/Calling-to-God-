import { describe, it, expect } from "vitest";
import { locales, defaultLocale, isLocale, dirOf, localeMeta } from "./config";
import { getDictionary } from "./get-dictionary";
import { en } from "./dictionaries/en";
import type { Dictionary } from "./types";

/** Walk the nested dictionary and return dotted key paths. */
function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" ? keyPaths(v as Record<string, unknown>, path) : [path];
  });
}

const enKeys = keyPaths(en as unknown as Record<string, unknown>).sort();

describe("i18n configuration", () => {
  it("exposes the five requested target languages plus Arabic", () => {
    expect(locales).toEqual(["en", "ar", "zh", "hi", "ja", "ru"]);
    expect(locales).toContain("zh");
    expect(locales).toContain("hi");
    expect(locales).toContain("ja");
    expect(locales).toContain("ru");
    expect(locales).toContain("en");
  });

  it("marks Arabic as the only RTL locale", () => {
    const rtl = locales.filter((l) => dirOf(l) === "rtl");
    expect(rtl).toEqual(["ar"]);
    expect(localeMeta.ar.dir).toBe("rtl");
  });

  it("isLocale narrows correctly", () => {
    expect(isLocale("zh")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(defaultLocale).toBe("en");
  });
});

describe("dictionaries are complete and consistent", () => {
  for (const locale of locales) {
    it(`${locale} matches the English key set exactly`, () => {
      const dict = getDictionary(locale) as unknown as Record<string, unknown>;
      expect(keyPaths(dict).sort()).toEqual(enKeys);
    });

    it(`${locale} has no empty string values`, () => {
      const dict = getDictionary(locale) as unknown as Dictionary;
      const empties = keyPaths(dict as unknown as Record<string, unknown>).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], dict);
        return typeof value === "string" && value.trim() === "";
      });
      expect(empties).toEqual([]);
    });
  }
});
