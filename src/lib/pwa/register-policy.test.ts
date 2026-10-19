import { describe, it, expect } from "vitest";
import { shouldRegisterServiceWorker, type RegisterEnv } from "./register-policy";

const base: RegisterEnv = {
  nodeEnv: "production",
  inFrame: false,
  hasServiceWorker: true,
  secureContext: true,
  hostname: "trupath.example",
};

describe("shouldRegisterServiceWorker", () => {
  it("registers in a normal production browser", () => {
    expect(shouldRegisterServiceWorker(base)).toBe(true);
  });

  it("never registers in development", () => {
    expect(shouldRegisterServiceWorker({ ...base, nodeEnv: "development" })).toBe(false);
  });

  it("never registers inside a preview frame", () => {
    expect(shouldRegisterServiceWorker({ ...base, inFrame: true })).toBe(false);
  });

  it("requires service worker support", () => {
    expect(shouldRegisterServiceWorker({ ...base, hasServiceWorker: false })).toBe(false);
  });

  it("requires a secure context, allowing localhost", () => {
    expect(shouldRegisterServiceWorker({ ...base, secureContext: false })).toBe(false);
    expect(
      shouldRegisterServiceWorker({ ...base, secureContext: false, hostname: "localhost" }),
    ).toBe(true);
  });
});
