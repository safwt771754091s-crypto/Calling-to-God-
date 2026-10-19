import "dotenv/config";
import { buildPlan } from "../src/lib/agents/planner";
import { generateContent } from "../src/lib/agents/orchestrator";
import type { Region } from "../src/lib/agents/types";

/**
 * Scheduled dawah-content generation.
 *
 * Builds a weekly/monthly plan and runs each item through the agent pipeline
 * (research -> write -> localize -> review). Nothing is published here: every
 * item lands in SCHOLAR_REVIEW for a human. Designed to run from a cron/Action.
 *
 *   tsx scripts/generate-content.ts --limit 5
 *   tsx scripts/generate-content.ts --period monthly --regions GLOBAL --limit 3
 *   tsx scripts/generate-content.ts --dry-run
 */
function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const period = (arg("period", "weekly") as "weekly" | "monthly") ?? "weekly";
  const limit = Number(arg("limit", "5"));
  const regionsArg = arg("regions");
  const regions = regionsArg
    ? (regionsArg.split(",") as Region[])
    : undefined;

  const plan = buildPlan({ period, regions });
  const items = plan.items.slice(0, limit);

  console.log(`Plan: ${plan.period}, ${plan.items.length} item(s); processing ${items.length}${dryRun ? " (dry-run)" : ""}.`);

  for (const item of items) {
    const label = `${item.locale}/${item.region} · ${item.contentType} · ${item.topic}`;
    if (dryRun) {
      console.log(`  • ${label} @ ${item.scheduledAt}`);
      continue;
    }
    try {
      const result = await generateContent({
        locale: item.locale,
        region: item.region,
        contentType: item.contentType,
        topic: item.topic,
        scheduledAt: new Date(item.scheduledAt),
      });
      console.log(`  ✓ ${label} -> ${result.status} (grounded=${result.grounded}, human=${result.requiresHuman})`);
    } catch (err) {
      console.error(`  ✗ ${label}: ${(err as Error).message}`);
    }
  }

  console.log("Done. Drafts are queued for human review (never auto-published).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
