import { describe, it, expect } from "vitest";
import { summarizeAudit, worstAtOrAbove, isSeverityAllowed } from "./security";

describe("summarizeAudit", () => {
  it("counts npm audit v2 vulnerabilities by severity", () => {
    const json = {
      vulnerabilities: {
        a: { severity: "high" },
        b: { severity: "critical" },
        c: { severity: "low" },
      },
    };
    const c = summarizeAudit(json);
    expect(c.high).toBe(1);
    expect(c.critical).toBe(1);
    expect(c.low).toBe(1);
    expect(c.total).toBe(3);
  });

  it("counts npm audit v1 advisories by severity", () => {
    const json = { advisories: { "1": { severity: "moderate" }, "2": { severity: "high" } } };
    const c = summarizeAudit(json);
    expect(c.moderate).toBe(1);
    expect(c.high).toBe(1);
    expect(c.total).toBe(2);
  });

  it("returns zeros for empty or malformed input", () => {
    expect(summarizeAudit(null).total).toBe(0);
    expect(summarizeAudit({}).total).toBe(0);
    expect(summarizeAudit({ vulnerabilities: { a: {} } }).total).toBe(0);
  });
});

describe("worstAtOrAbove / isSeverityAllowed", () => {
  const counts = { info: 0, low: 1, moderate: 0, high: 1, critical: 0, total: 2 };

  it("finds the worst severity at or above a threshold", () => {
    expect(worstAtOrAbove(counts, "high")).toBe("high");
    expect(worstAtOrAbove(counts, "low")).toBe("high");
    expect(worstAtOrAbove(counts, "critical")).toBeNull();
  });

  it("compares severities by rank", () => {
    expect(isSeverityAllowed("low", "high")).toBe(true);
    expect(isSeverityAllowed("critical", "high")).toBe(false);
    expect(isSeverityAllowed("moderate", "moderate")).toBe(false);
  });
});
