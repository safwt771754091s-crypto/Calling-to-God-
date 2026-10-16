import { describe, it, expect } from "vitest";
import { buildPlan, summarizePlan } from "./planner";
import { locales } from "@/i18n/config";

describe("planner", () => {
  it("produces a weekly plan scoped to shipped locales only", () => {
    const plan = buildPlan({ period: "weekly", startDate: new Date("2026-01-01T00:00:00Z") });
    expect(plan.period).toBe("weekly");
    expect(plan.items.length).toBeGreaterThan(0);
    for (const item of plan.items) {
      expect(locales).toContain(item.locale);
    }
  });

  it("covers India, China and Japan with the right locales", () => {
    const plan = buildPlan({ regions: ["INDIA", "CHINA", "JAPAN"] });
    const byRegion = summarizePlan(plan).byRegion;
    expect(byRegion.INDIA).toBeGreaterThan(0);
    expect(byRegion.CHINA).toBeGreaterThan(0);
    expect(byRegion.JAPAN).toBeGreaterThan(0);

    const indiaLocales = new Set(plan.items.filter((i) => i.region === "INDIA").map((i) => i.locale));
    expect(indiaLocales.has("hi")).toBe(true);
    expect(indiaLocales.has("en")).toBe(true);

    const chinaLocales = new Set(plan.items.filter((i) => i.region === "CHINA").map((i) => i.locale));
    expect([...chinaLocales]).toEqual(["zh"]);

    const japanLocales = new Set(plan.items.filter((i) => i.region === "JAPAN").map((i) => i.locale));
    expect([...japanLocales]).toEqual(["ja"]);
  });

  it("gives every item a measurable goal and a schedule", () => {
    const plan = buildPlan({ period: "monthly" });
    for (const item of plan.items) {
      expect(item.goals.target).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(item.scheduledAt))).toBe(false);
    }
  });
});
