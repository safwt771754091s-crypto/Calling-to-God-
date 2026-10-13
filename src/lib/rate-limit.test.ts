import { describe, it, expect } from "vitest";
import { rateLimit, clientIp } from "./rate-limit";

function reqWith(headers: Record<string, string>): Request {
  return new Request("https://example.test/api", { headers });
}

describe("rateLimit", () => {
  it("allows up to the limit then blocks within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const r = rateLimit(key, 3, 60_000);
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(2 - i);
    }
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps separate counters per key", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });

  it("resets after the window elapses", async () => {
    const key = `w-${Math.random()}`;
    expect(rateLimit(key, 1, 5).ok).toBe(true);
    expect(rateLimit(key, 1, 5).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 12));
    expect(rateLimit(key, 1, 5).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("reads the first x-forwarded-for entry", () => {
    expect(clientIp(reqWith({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip then unknown", () => {
    expect(clientIp(reqWith({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(reqWith({}))).toBe("unknown");
  });
});
