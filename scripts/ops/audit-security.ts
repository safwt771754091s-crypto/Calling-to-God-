import { spawnSync } from "node:child_process";
import { summarizeAudit, worstAtOrAbove, isSeverityAllowed, SEVERITIES, type Severity } from "../../src/lib/ops/security";

/**
 * Dependency security audit. Runs `npm audit --json` and summarises the result.
 * Fails when a vulnerability at or above --threshold is present.
 *
 *   tsx scripts/ops/audit-security.ts                     # fail on high+
 *   tsx scripts/ops/audit-security.ts --prod              # runtime deps only
 *   tsx scripts/ops/audit-security.ts --threshold moderate
 *   tsx scripts/ops/audit-security.ts --warn              # report only
 */
function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const threshold = (arg("threshold", "high") as Severity);
if (!SEVERITIES.includes(threshold)) {
  console.error(`Invalid threshold "${threshold}". Use one of: ${SEVERITIES.join(", ")}`);
  process.exit(2);
}
const warnOnly = process.argv.includes("--warn");
const prodOnly = process.argv.includes("--prod");

function main() {
  const args = ["audit", "--json"];
  if (prodOnly) args.push("--omit=dev");
  const proc = spawnSync("npm", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  let json: unknown = {};
  try {
    json = JSON.parse(proc.stdout || "{}");
  } catch {
    console.error("Could not parse `npm audit --json` output.");
    process.exit(2);
  }

  const counts = summarizeAudit(json);
  console.log(`Dependency audit${prodOnly ? " (production only)" : ""}:`);
  for (const sev of [...SEVERITIES].reverse()) {
    console.log(`  ${sev.padEnd(9)} ${counts[sev]}`);
  }
  console.log(`  ${"total".padEnd(9)} ${counts.total}`);

  const worst = worstAtOrAbove(counts, threshold);
  const blocking = SEVERITIES.filter((s) => counts[s] > 0 && !isSeverityAllowed(s, threshold));

  if (blocking.length === 0) {
    console.log(`\n✓ No vulnerabilities at or above "${threshold}".`);
    return;
  }

  console.error(`\n✗ ${blocking.join(", ")} vulnerabilities found (threshold: ${threshold}; worst: ${worst}).`);
  console.error("  Run `npm audit fix` or review the advisory before shipping.");
  if (!warnOnly) process.exit(1);
}

main();
