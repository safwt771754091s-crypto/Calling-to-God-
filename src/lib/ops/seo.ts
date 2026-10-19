/**
 * Pure SEO checks for the sitemap. The CLI (scripts/ops/check-seo.ts) fetches
 * /sitemap.xml and feeds the parsed entries here.
 */

export interface SitemapEntry {
  url: string;
  alternates?: Record<string, string>;
  priority?: number;
}

/**
 * Parse `<url>` blocks from a sitemap, capturing the loc and any
 * `xhtml:link rel="alternate" hreflang="…"` entries. Tolerant of attribute
 * order and whitespace.
 */
export function parseSitemapEntries(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const blockRe = /<url\b[^>]*>([\s\S]*?)<\/url>/gi;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(xml)) !== null) {
    const inner = block[1];
    const locMatch = /<loc>\s*([^<\s]+)\s*<\/loc>/i.exec(inner);
    if (!locMatch) continue;
    const entry: SitemapEntry = { url: locMatch[1] };
    const alt: Record<string, string> = {};
    const linkRe = /<xhtml:link\b[^>]*>/gi;
    let link: RegExpExecArray | null;
    while ((link = linkRe.exec(inner)) !== null) {
      const tag = link[0];
      const lang = /\bhreflang\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
      const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
      if (lang && href) alt[lang] = href;
    }
    if (Object.keys(alt).length > 0) entry.alternates = alt;
    const prio = /<priority>\s*([\d.]+)\s*<\/priority>/i.exec(inner)?.[1];
    if (prio) entry.priority = Number(prio);
    entries.push(entry);
  }
  return entries;
}

export interface SeoIssue {
  url: string;
  problem: string;
}

export interface SeoOptions {
  /** Locale codes that every page's hreflang alternates must cover. */
  locales: string[];
  /** Require each entry to carry hreflang alternates. */
  requireAlternates?: boolean;
}

/**
 * Validates a sitemap's structure: no duplicate URLs, every locale present in
 * the alternates, an x-default present, and alternates pointing at the same
 * path across locales. Returns the list of problems (empty = healthy).
 */
export function auditSitemap(entries: SitemapEntry[], opts: SeoOptions): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const seen = new Set<string>();

  for (const e of entries) {
    if (seen.has(e.url)) issues.push({ url: e.url, problem: "duplicate URL" });
    seen.add(e.url);

    if (!opts.requireAlternates) continue;
    const alt = e.alternates;
    if (!alt || Object.keys(alt).length === 0) {
      issues.push({ url: e.url, problem: "missing hreflang alternates" });
      continue;
    }
    for (const locale of opts.locales) {
      if (!alt[locale]) issues.push({ url: e.url, problem: `missing alternate for locale "${locale}"` });
    }
    if (!alt["x-default"]) issues.push({ url: e.url, problem: "missing x-default alternate" });

    // Alternates should share the same path suffix (locale is the first segment).
    const suffix = pathAfterLocale(e.url);
    for (const [lang, target] of Object.entries(alt)) {
      if (lang === "x-default") continue;
      if (pathAfterLocale(target) !== suffix) {
        issues.push({ url: e.url, problem: `alternate "${lang}" points to a different path` });
      }
    }
  }

  return issues;
}

/** Everything after the first path segment, e.g. "/en/quran/2" -> "quran/2". */
export function pathAfterLocale(url: string): string {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).slice(1).join("/");
  } catch {
    return "";
  }
}
