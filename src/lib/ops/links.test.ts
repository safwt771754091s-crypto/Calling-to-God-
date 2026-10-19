import { describe, it, expect } from "vitest";
import {
  parseSitemapLocs,
  extractLinks,
  classify,
  isBroken,
  summarizeLinks,
  type LinkResult,
} from "./links";

describe("parseSitemapLocs", () => {
  it("extracts every <loc> URL", () => {
    const xml = `<urlset>
      <url><loc>https://x.dev/en</loc></url>
      <url><loc>https://x.dev/ar</loc></url>
    </urlset>`;
    expect(parseSitemapLocs(xml)).toEqual(["https://x.dev/en", "https://x.dev/ar"]);
  });

  it("returns an empty list for a document with no locs", () => {
    expect(parseSitemapLocs("<urlset></urlset>")).toEqual([]);
  });
});

describe("extractLinks", () => {
  it("resolves relative hrefs against the base and strips fragments", () => {
    const html = `<a href="/en/quran">q</a><a href="hadith#top">h</a>`;
    expect(extractLinks(html, "https://x.dev/en/")).toEqual([
      "https://x.dev/en/quran",
      "https://x.dev/en/hadith",
    ]);
  });

  it("ignores anchors, mailto, tel and javascript links", () => {
    const html = `<a href="#x">1</a><a href="mailto:a@b.c">2</a><a href="tel:+1">3</a><a href="javascript:void(0)">4</a>`;
    expect(extractLinks(html, "https://x.dev")).toEqual([]);
  });

  it("de-duplicates repeated links", () => {
    const html = `<a href="/a">1</a><a href="/a">2</a>`;
    expect(extractLinks(html, "https://x.dev")).toEqual(["https://x.dev/a"]);
  });
});

describe("classify / isBroken / summarizeLinks", () => {
  it("classifies internal vs external by host", () => {
    expect(classify("https://x.dev/a", "x.dev")).toBe("internal");
    expect(classify("https://other.dev/a", "x.dev")).toBe("external");
    expect(classify("not-a-url", "x.dev")).toBe("external");
  });

  it("treats 4xx/5xx and network errors as broken, 2xx/3xx as fine", () => {
    expect(isBroken(200)).toBe(false);
    expect(isBroken(301)).toBe(false);
    expect(isBroken(404)).toBe(true);
    expect(isBroken(500)).toBe(true);
    expect(isBroken(0)).toBe(true);
  });

  it("summarizes a mix of results", () => {
    const results: LinkResult[] = [
      { url: "a", status: 200, kind: "internal", ok: true },
      { url: "b", status: 404, kind: "internal", ok: false },
      { url: "c", status: 500, kind: "external", ok: false },
    ];
    const report = summarizeLinks(results);
    expect(report.checked).toBe(3);
    expect(report.ok).toBe(1);
    expect(report.broken.map((b) => b.url)).toEqual(["b", "c"]);
  });
});
