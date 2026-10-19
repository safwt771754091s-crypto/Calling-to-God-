/**
 * Pure helpers to summarise `npm audit --json` output. Kept dependency-free so
 * they can be unit-tested and reused by scripts/ops/audit-security.ts.
 */

export type Severity = "info" | "low" | "moderate" | "high" | "critical";

export const SEVERITIES: Severity[] = ["info", "low", "moderate", "high", "critical"];

export interface SeverityCounts {
  info: number;
  low: number;
  moderate: number;
  high: number;
  critical: number;
  total: number;
}

const EMPTY: SeverityCounts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };

function isSeverity(v: unknown): v is Severity {
  return typeof v === "string" && (SEVERITIES as string[]).includes(v);
}

/**
 * Count vulnerabilities by severity from `npm audit --json`. Supports the v2
 * shape (`{ vulnerabilities: { pkg: { severity } } }`) and the v1 shape
 * (`{ advisories: { id: { severity } } }`). Unknown/absent input yields zeros.
 */
export function summarizeAudit(json: unknown): SeverityCounts {
  const counts: SeverityCounts = { ...EMPTY };
  if (!json || typeof json !== "object") return counts;
  const obj = json as Record<string, unknown>;

  const collect = (record: unknown) => {
    if (!record || typeof record !== "object") return;
    for (const entry of Object.values(record as Record<string, unknown>)) {
      const sev = (entry as Record<string, unknown>)?.severity;
      if (isSeverity(sev)) {
        counts[sev]++;
        counts.total++;
      }
    }
  };

  collect(obj.vulnerabilities);
  collect(obj.advisories);
  return counts;
}

/**
 * Highest severity at or above `threshold` that is present, or null if the
 * audit is clean at that threshold. `threshold: "high"` fails only on
 * high/critical; `threshold: "low"` fails on anything.
 */
export function worstAtOrAbove(counts: SeverityCounts, threshold: Severity): Severity | null {
  const min = SEVERITIES.indexOf(threshold);
  for (let i = SEVERITIES.length - 1; i >= min; i--) {
    if (counts[SEVERITIES[i]] > 0) return SEVERITIES[i];
  }
  return null;
}

export function isSeverityAllowed(severity: Severity, threshold: Severity): boolean {
  return SEVERITIES.indexOf(severity) < SEVERITIES.indexOf(threshold);
}
