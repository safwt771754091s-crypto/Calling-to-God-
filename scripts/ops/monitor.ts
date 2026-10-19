import "dotenv/config";

/**
 * Uptime monitor. Polls a health endpoint (and the home page) and, when a
 * failure persists, posts an alert to a webhook. Designed to run on a schedule
 * from GitHub Actions; also usable from cron.
 *
 *   tsx scripts/ops/monitor.ts --base https://example.com
 *   tsx scripts/ops/monitor.ts --base https://x --retries 3 --delay 5000
 *
 * Alert webhook (any of): SLACK_WEBHOOK_URL, DISCORD_WEBHOOK_URL, ALERT_WEBHOOK_URL.
 */
function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const BASE = (arg("base") || process.env.PRODUCTION_URL || process.env.SITE_URL || "").replace(/\/$/, "");
const RETRIES = Number(arg("retries", "3"));
const DELAY = Number(arg("delay", "5000"));
const TIMEOUT = Number(arg("timeout", "15000"));

if (!BASE) {
  console.error("No base URL. Pass --base or set PRODUCTION_URL/SITE_URL.");
  process.exit(2);
}

const ENDPOINTS = [`${BASE}/api/health`, `${BASE}/`];

async function probe(url: string): Promise<number> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal });
    return res.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(t);
  }
}

function webhookUrl(): string | undefined {
  return process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || process.env.ALERT_WEBHOOK_URL;
}

async function alert(text: string) {
  const url = webhookUrl();
  if (!url) {
    console.error("(no alert webhook configured — skipping notification)");
    return;
  }
  // Slack and Discord both accept a {"text": "..."} body.
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    console.log("Alert posted to webhook.");
  } catch (e) {
    console.error(`Failed to post alert: ${(e as Error).message}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Monitoring ${BASE} (${RETRIES} attempt(s) per endpoint)…`);
  const failures: string[] = [];

  for (const url of ENDPOINTS) {
    let status = 0;
    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      status = await probe(url);
      if (status > 0 && status < 400) break;
      if (attempt < RETRIES) await sleep(DELAY);
    }
    const ok = status > 0 && status < 400;
    console.log(`  ${ok ? "✓" : "✗"} ${url} -> ${status}`);
    if (!ok) failures.push(`${url} (status ${status})`);
  }

  if (failures.length === 0) {
    console.log("\nAll endpoints healthy.");
    return;
  }

  const text = `🚨 ${BASE} health check FAILED:\n${failures.map((f) => `• ${f}`).join("\n")}`;
  console.error(`\n${text}`);
  await alert(text);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
