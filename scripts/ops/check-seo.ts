import "dotenv/config";
import { parseSitemapEntries, auditSitemap } from "../../src/lib/ops/seo";
import { locales } from "../../src/i18n/config";

/** Pathname of a URL, tolerant of malformed input. */
function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * SEO sitemap audit. Fetches /sitemap.xml and verifies structure: no duplicate
 * URLs, every locale has an hreflang alternate, an x-default exists, and the
 * alternates point at the same path across locales. Read-only.
 *
 *   tsx scripts/ops/check-seo.ts
 *   tsx scripts/ops/check-seo.ts --base https://example.com
 */
function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const BASE = (arg("base") || process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:12000").replace(/\/$/, "");

async function main() {
  console.log(`SEO audit against ${BASE}…`);

  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) {
    console.error(`  ✗ /sitemap.xml returned ${res.status}`);
    process.exit(1);
  }
  const xml = await res.text();
  const entries = parseSitemapEntries(xml);
  console.log(`  sitemap entries: ${entries.length}`);

  if (entries.length === 0) {
    console.error("  ✗ sitemap has no <url> entries");
    process.exit(1);
  }

  // The home pages for each locale must be present.
  const issues = auditSitemap(entries, { locales: [...locales], requireAlternates: true });

  // The sitemap uses absolute production URLs, which may differ from --base
  // (e.g. auditing localhost). Compare by pathname, not full URL.
  const paths = new Set(entries.map((e) => pathnameOf(e.url)));
  for (const l of locales) {
    if (!paths.has(`/${l}`)) {
      issues.push({ url: `${BASE}/${l}`, problem: "locale home page missing from sitemap" });
    }
  }

  // robots.txt should advertise the sitemap.
  try {
    const robots = await (await fetch(`${BASE}/robots.txt`)).text();
    if (!/sitemap/i.test(robots)) issues.push({ url: `${BASE}/robots.txt`, problem: "robots.txt does not reference the sitemap" });
  } catch {
    issues.push({ url: `${BASE}/robots.txt`, problem: "robots.txt not reachable" });
  }

  for (const i of issues.slice(0, 40)) console.log(`  ✗ ${i.url}: ${i.problem}`);
  console.log(`\n${issues.length} SEO issue(s) across ${entries.length} entries.`);

  if (issues.length > 0) {
    console.error("SEO audit failed.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
