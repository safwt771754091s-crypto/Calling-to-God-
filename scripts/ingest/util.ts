import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const CACHE_DIR = join(process.cwd(), ".cache", "ingest");

/** Fetch a URL with retries and an on-disk cache. Returns parsed JSON. */
export async function fetchJson<T = unknown>(
  url: string,
  cacheKey?: string,
): Promise<T> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = cacheKey ? join(CACHE_DIR, cacheKey) : undefined;
  if (cachePath && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8")) as T;
  }
  const text = await fetchText(url);
  if (cachePath) writeFileSync(cachePath, text);
  return JSON.parse(text) as T;
}

async function fetchText(url: string, attempts = 4): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      await sleep(500 * (i + 1));
    }
  }
  throw lastErr;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
