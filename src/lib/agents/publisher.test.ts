import { describe, it, expect } from "vitest";
import { idempotencyKey } from "./publisher";

describe("publisher idempotency", () => {
  it("is stable for the same content/platform/locale", () => {
    const a = idempotencyKey("content-1", "FACEBOOK", "en");
    const b = idempotencyKey("content-1", "FACEBOOK", "en");
    expect(a).toBe(b);
    expect(a).toHaveLength(40);
  });

  it("differs across platform or locale, preventing cross-post collisions", () => {
    const base = idempotencyKey("content-1", "FACEBOOK", "en");
    expect(idempotencyKey("content-1", "TELEGRAM", "en")).not.toBe(base);
    expect(idempotencyKey("content-1", "FACEBOOK", "ar")).not.toBe(base);
    expect(idempotencyKey("content-2", "FACEBOOK", "en")).not.toBe(base);
  });
});
