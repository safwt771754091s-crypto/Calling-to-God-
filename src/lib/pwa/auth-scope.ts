/**
 * Auth/OAuth path scope for the service worker. Single source of truth shared
 * by the Workbox build script and the unit tests.
 */

/** Paths that must never be cached and never answered from cache. */
export const AUTH_PATHS = [
  "/admin/login",
  "/login",
  "/signin",
  "/sign-in",
  "/api/auth",
  "/api/social",
  "/oauth",
  "/callback",
];

/**
 * Build a RegExp matching any of `paths` and their sub-paths. A RegExp is
 * serialized verbatim into the worker; a predicate that closes over AUTH_PATHS
 * would lose that variable at runtime.
 */
export function buildAuthPattern(paths: string[] = AUTH_PATHS): RegExp {
  const escaped = paths.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\//g, "\\/"));
  return new RegExp(`^(?:${escaped.join("|")})(?:\\/|$)`);
}

/** True when a pathname is an auth/OAuth surface (must bypass the cache). */
export function isAuthPath(pathname: string): boolean {
  return buildAuthPattern().test(pathname);
}
