import { describe, it, expect } from "vitest";
import { auditDictionaries, compareDictionary, keyPaths, valueAt } from "./keys";
import { getDictionary } from "./get-dictionary";
import { locales, defaultLocale } from "./config";

describe("dictionary key audit", () => {
  it("keyPaths flattens nested objects to dotted paths", () => {
    expect(keyPaths({ a: { b: "x", c: { d: "y" } } })).toEqual(["a.b", "a.c.d"]);
  });

  it("valueAt resolves a dotted path", () => {
    const o = { a: { b: "x" } };
    expect(valueAt(o, "a.b")).toBe("x");
    expect(valueAt(o, "a.missing")).toBeUndefined();
  });

  it("every locale is complete against the reference", () => {
    const broken = auditDictionaries()
      .filter((r) => !r.complete)
      .map((r) => ({ l: r.locale, missing: r.missing, extra: r.extra, empty: r.empty }));
    expect(broken).toEqual([]);
  });

  it("the reference locale reports no drift against itself", () => {
    const report = compareDictionary(defaultLocale);
    expect(report.missing).toEqual([]);
    expect(report.extra).toEqual([]);
    expect(report.empty).toEqual([]);
  });

  it("getDictionary returns a populated object for every locale", () => {
    for (const l of locales) {
      expect(Object.keys(getDictionary(l)).length).toBeGreaterThan(0);
    }
  });
});
