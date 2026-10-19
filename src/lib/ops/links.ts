/**
 * Pure helpers for the link audit. Kept free of I/O so they can be unit-tested
 * and reused by the CLI runner (scripts/ops/check-links.ts).
 */

/** Extract every <loc> URL from a sitemap XML document. */
export function parseSitemapLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) locs.push(m[1]);
  return locs;
}

/**
 * Extract absolute links from HTML. Resolves relative hrefs against `baseUrl`
 * and strips fragments. Returns de-duplicated URLs.
 */
export function extractLinks(html: string, baseUrl: string): string[] {
  const hrefs: string[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) hrefs.push(m[1]);

  const seen = new Set<string>();
  for (const raw of hrefs) {
    const href = raw.trim();
    if (!href || href.startsWith("#")) continue;
    if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try {
      const url = new URL(href, baseUrl);
      url.hash = "";
      seen.add(url.toString());
    } catch {
      // Not a resolvable URL; ignore.
    }
  }
  return [...seen];
}

export type LinkKind = "internal" | "external";

export function classify(url: string, siteHost: string): LinkKind {
  try {
    return new URL(url).host === siteHost ? "internal" : "external";
  } catch {
    return "external";
  }
}

export interface LinkResult {
  url: string;
  status: number;
  kind: LinkKind;
  ok: boolean;
  foundOn?: string;
}

/** 2xx and 3xx are acceptable; 4xx/5xx (or a network error status of 0) are broken. */
export function isBroken(status: number): boolean {
  return status === 0 || status >= 400;
}

export interface LinkReport {
  checked: number;
  ok: number;
  broken: LinkResult[];
}

export function summarizeLinks(results: LinkResult[]): LinkReport {
  const broken = results.filter((r) => !r.ok);
  return { checked: results.length, ok: results.length - broken.length, broken };
}
