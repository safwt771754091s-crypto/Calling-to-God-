/**
 * Workbox service-worker generator for the Next.js (Turbopack) build.
 *
 * Runs after `next build` via `npm run build`. It precaches the immutable build
 * assets plus the offline shell, then installs runtime routes:
 *
 *   - Pages (navigations)      → NetworkFirst (fresh content, cached fallback)
 *   - Hashed static assets     → CacheFirst  (immutable, content-addressed)
 *   - Fonts / images           → CacheFirst / StaleWhileRevalidate
 *   - /api/health              → NetworkOnly (never stale liveness data)
 *   - Login + OAuth/auth flows → NetworkOnly (never cached, never fallback)
 *
 * The service worker is only produced by the production build; the browser
 * additionally never registers it in development or inside a preview frame
 * (see src/components/pwa-registrar.tsx).
 */
import { generateSW } from "workbox-build";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTH_PATHS, buildAuthPattern } from "../../src/lib/pwa/auth-scope.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Content hash so the offline shell is re-precached whenever it changes. */
function fileRevision(relPath: string): string {
  const data = readFileSync(join(root, "public", relPath));
  return createHash("md5").update(data).digest("hex");
}

// A RegExp is serialized verbatim into the worker (see auth-scope).
const AUTH_PATTERN = buildAuthPattern();

async function main() {
  const { count, size, warnings } = await generateSW({
    globDirectory: ".next/static",
    globPatterns: ["**/*.{js,css,html,woff,woff2,ttf,otf,png,svg,ico,webp,avif}"],
    globIgnores: ["**/*.map"],
    // Next serves these files under /_next/static/, but globDirectory strips
    // that prefix — restore it or every precache fetch 404s and the worker
    // never installs. (additionalManifestEntries are left unprefixed.)
    modifyURLPrefix: { "": "/_next/static/" },

    // The offline shell lives in public/ (outside globDirectory); add it to the
    // precache manifest explicitly, else the navigation fallback can't resolve it.
    additionalManifestEntries: [{ url: "offline.html", revision: fileRevision("offline.html") }],

    swDest: "public/sw.js",

    // Navigation requests fall back to the offline shell when the network fails.
    navigateFallback: "/offline.html",
    navigateFallbackDenylist: AUTH_PATHS.map((p) => new RegExp(`^${p}(/|$)`)),

    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: false,

    runtimeCaching: [
      {
        // Login, OAuth and account flows: network only, no cache, no fallback.
        urlPattern: AUTH_PATTERN,
        handler: "NetworkOnly",
      },
      {
        // Health/liveness: always hit the network.
        urlPattern: ({ url }) => url.pathname === "/api/health",
        handler: "NetworkOnly",
      },
      {
        // Other API reads: try the network first, short-lived cache fallback.
        urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "api",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Pages: network first, fall back to the cached copy when offline.
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 96, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        // Build assets are content-hashed under /_next/static → immutable.
        urlPattern: ({ url }) => url.pathname.startsWith("/_next/static/"),
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 256, maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Self-hosted fonts (next/font emits these under /_next/static/media).
        urlPattern: ({ request }) => request.destination === "font",
        handler: "CacheFirst",
        options: {
          cacheName: "fonts",
          expiration: { maxEntries: 32, maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Images: serve from cache, refresh in the background.
        urlPattern: ({ request }) => request.destination === "image",
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "images",
          expiration: { maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Generated icons/manifest: cache first (stable, small).
        urlPattern: ({ url }) =>
          url.pathname === "/manifest.webmanifest" ||
          url.pathname === "/icon.svg" ||
          url.pathname === "/favicon.ico",
        handler: "CacheFirst",
        options: {
          cacheName: "app-meta",
          expiration: { maxEntries: 16, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  });

  for (const w of warnings) console.warn(`[workbox] ${w}`);
  console.log(`[workbox] precached ${count} files (${(size / 1024).toFixed(1)} KiB).`);
}

main().catch((err) => {
  console.error("[workbox] generation failed:", err);
  process.exit(1);
});
