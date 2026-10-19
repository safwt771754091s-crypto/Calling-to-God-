import "dotenv/config";
import { parseSitemapLocs, extractLinks, classify, isBroken, summarizeLinks, type LinkResult } from "../../src/lib/ops/links";

/**
 * Broken-link audit. Crawls the sitemap (falling back to the home page), then
 * checks every link it finds — internal links on the site plus the external
 * links the pages point at. Read-only: it only issues GET/HEAD requests.
 *
 *   tsx scripts/ops/check-links.ts
 *   tsx scripts/ops/check-links.ts --base https://example.com --max 60
 *   tsx scripts/ops/check-links.ts --internal-only
 */
function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const BASE = (arg("base") || process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:12000").replace(/\/$/, "");
const MAX = Number(arg("max", "80"));
const INTERNAL_ONLY = process.argv.includes("--internal-only");
const TIMEOUT = Number(arg("timeout", "10000"));

async function head(url: string): Promise<number> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    return res.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(t);
  }
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { redirect: "follow" });
  return res.text();
}

async function main() {
  const host = new URL(BASE).host;
  console.log(`Link audit against ${BASE} (max ${MAX} pages)…`);

  let pages: string[] = [];
  try {
    const sm = await getText(`${BASE}/sitemap.xml`);
    pages = parseSitemapLocs(sm);
  } catch {
    // fall through
  }
  if (pages.length === 0) pages = [`${BASE}/`, `${BASE}/en`, `${BASE}/ar`];
  pages = pages.slice(0, MAX);

  const found = new Map<string, string>(); // url -> foundOn
  for (const page of pages) {
    try {
      const html = await getText(page);
      for (const link of extractLinks(html, page)) found.set(link, page);
    } catch {
      console.error(`  ! could not fetch ${page}`);
    }
  }

  const targets = [...found.entries()]
    .filter(([url]) => !INTERNAL_ONLY || classify(url, host) === "internal")
    .filter(([url]) => !url.startsWith("mailto:"));

  console.log(`Checking ${targets.length} unique link(s)…`);
  const results: LinkResult[] = [];
  const concurrency = 8;
  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    const settled = await Promise.all(
      batch.map(async ([url, foundOn]) => {
        const status = await head(url);
        return { url, status, kind: classify(url, host), ok: !isBroken(status), foundOn } as LinkResult;
      }),
    );
    results.push(...settled);
  }

  const report = summarizeLinks(results);
  for (const r of report.broken) {
    console.log(`  ✗ [${r.status}] ${r.url}  (on ${r.foundOn})`);
  }
  console.log(`\n${report.ok}/${report.checked} links OK, ${report.broken.length} broken.`);

  if (report.broken.length > 0) {
    console.error("Link audit failed — broken links detected.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
