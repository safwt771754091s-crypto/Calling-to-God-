import { describe, it, expect } from "vitest";
import { review } from "./reviewer";
import type { ResearchNote } from "./types";
import type { Draft } from "./writer";
import { locales } from "@/i18n/config";

const draft = (body: string): Draft => ({
  title: "T",
  body,
  usedAi: true,
  provider: "openai",
  model: "gpt-4o-mini",
});

const note = (sensitive: boolean, grounded: boolean): ResearchNote => ({
  topic: "t",
  summary: "",
  sources: grounded ? [{ label: "Al-Baqarah 2:255", kind: "quran", ref: "2:255" }] : [],
  sensitive,
  grounded,
});

describe("reviewer gate", () => {
  it("blocks religious content that has no verifiable source", () => {
    const r = review({ note: note(true, false), draft: draft("About the Quran"), locale: "en", supportedLocales: locales });
    expect(r.decision).toBe("BLOCKED");
    expect(r.requiresHuman).toBe(true);
  });

  it("routes grounded scriptural content to a human", () => {
    const r = review({ note: note(true, true), draft: draft("The Prophet said..."), locale: "en", supportedLocales: locales });
    expect(r.decision).toBe("NEEDS_HUMAN");
    expect(r.requiresHuman).toBe(true);
  });

  it("flags sensitive terms even without a scripture-backed note", () => {
    const r = review({ note: note(false, false), draft: draft("A question about halal food"), locale: "en", supportedLocales: locales });
    expect(r.requiresHuman).toBe(true);
  });

  it("blocks unsupported locales", () => {
    const r = review({ note: note(false, false), draft: draft("hello"), locale: "fr", supportedLocales: locales });
    expect(r.decision).toBe("BLOCKED");
  });

  it("passes plain non-sensitive content without a human gate", () => {
    const r = review({ note: note(false, false), draft: draft("Welcome to our community portal."), locale: "en", supportedLocales: locales });
    expect(r.decision).toBe("APPROVED_FOR_HUMAN");
    expect(r.requiresHuman).toBe(false);
  });
});
