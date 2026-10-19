import { describe, it, expect } from "vitest";
import { AUTH_PATHS, buildAuthPattern, isAuthPath } from "./auth-scope";

describe("auth-scope", () => {
  it("matches each auth path and its sub-paths", () => {
    for (const p of AUTH_PATHS) {
      expect(isAuthPath(p)).toBe(true);
      expect(isAuthPath(`${p}/nested`)).toBe(true);
    }
  });

  it("matches concrete login and OAuth surfaces", () => {
    expect(isAuthPath("/admin/login")).toBe(true);
    expect(isAuthPath("/api/auth/callback/google")).toBe(true);
    expect(isAuthPath("/api/auth/signin")).toBe(true);
    expect(isAuthPath("/oauth/authorize")).toBe(true);
  });

  it("does not match ordinary content or lookalike paths", () => {
    expect(isAuthPath("/en/quran/2")).toBe(false);
    expect(isAuthPath("/ar/hadith")).toBe(false);
    expect(isAuthPath("/api/health")).toBe(false);
    expect(isAuthPath("/login-help")).toBe(false);
    expect(isAuthPath("/callback-history")).toBe(false);
  });

  it("produces a serializable source (no closure over AUTH_PATHS)", () => {
    const src = buildAuthPattern().source;
    expect(src).toContain("admin");
    expect(src).toContain("oauth");
    expect(src).not.toContain("AUTH_PATHS");
  });
});
