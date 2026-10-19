import { describe, it, expect } from "vitest";
import { auditSitemap, pathAfterLocale, type SitemapEntry } from "./seo";
import { locales } from "@/i18n/config";

const LOCALES = [...locales];

function entry(url: string, path: string): SitemapEntry {
  const alternates: Record<string, string> = {};
  for (const l of LOCALES) alternates[l] = `https://x.dev/${l}${path ? "/" + path : ""}`;
  alternates["x-default"] = `https://x.dev/en${path ? "/" + path : ""}`;
  return { url, alternates };
}

describe("pathAfterLocale", () => {
  it("drops the locale segment", () => {
    expect(pathAfterLocale("https://x.dev/en/quran/2")).toBe("quran/2");
    expect(pathAfterLocale("https://x.dev/ar")).toBe("");
  });
});

describe("auditSitemap", () => {
  it("passes a well-formed sitemap", () => {
    const entries = LOCALES.map((l) => entry(`https://x.dev/${l}`, ""));
    expect(auditSitemap(entries, { locales: LOCALES, requireAlternates: true })).toEqual([]);
  });

  it("flags duplicate URLs", () => {
    const e = entry("https://x.dev/en", "");
    const issues = auditSitemap([e, { ...e }], { locales: LOCALES, requireAlternates: true });
    expect(issues.some((i) => i.problem === "duplicate URL")).toBe(true);
  });

  it("flags a missing locale alternate", () => {
    const e = entry("https://x.dev/en", "");
    delete e.alternates!.zh;
    const issues = auditSitemap([e], { locales: LOCALES, requireAlternates: true });
    expect(issues.some((i) => i.problem.includes('"zh"'))).toBe(true);
  });

  it("flags a missing x-default", () => {
    const e = entry("https://x.dev/en", "");
    delete e.alternates!["x-default"];
    const issues = auditSitemap([e], { locales: LOCALES, requireAlternates: true });
    expect(issues.some((i) => i.problem.includes("x-default"))).toBe(true);
  });

  it("flags an alternate that points at a different path", () => {
    const e = entry("https://x.dev/en/quran", "quran");
    e.alternates!.fr = "https://x.dev/fr/hadith";
    const issues = auditSitemap([e], { locales: LOCALES, requireAlternates: true });
    expect(issues.some((i) => i.problem.includes('"fr"'))).toBe(true);
  });
});
