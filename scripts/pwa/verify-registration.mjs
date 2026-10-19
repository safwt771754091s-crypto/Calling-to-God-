// Verifies service-worker registration behaviour against a live URL.
// Run: node scripts/pwa/verify-registration.mjs <baseUrl>
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:12000";
const executablePath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";

async function waitForActivation(page, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let last = { count: 0, scopes: [], controlled: false };
  while (Date.now() < deadline) {
    last = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return {
        count: regs.length,
        scopes: regs.map((r) => r.scope),
        controlled: !!navigator.serviceWorker.controller,
      };
    });
    if (last.count > 0) return last;
    await page.waitForTimeout(500);
  }
  return last;
}

const browser = await chromium.launch({
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

let failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

try {
  // 1) Normal top-level production page: worker must register.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${base}/en`, { waitUntil: "networkidle" });
  const state = await waitForActivation(page);
  check("registers on top-level page", state.count === 1, JSON.stringify(state));

  // 2) Preview frame: page embedded in an iframe must NOT register.
  const embed = await ctx.newPage();
  await embed.setContent(
    `<iframe src="${base}/en" width="800" height="600"></iframe>`,
    { waitUntil: "networkidle" },
  );
  let framedCount = -1;
  const frameDeadline = Date.now() + 15000;
  while (Date.now() < frameDeadline) {
    await embed.waitForTimeout(500);
    const frame = embed.frames().find((f) => f.url().includes("/en"));
    if (!frame) continue;
    try {
      framedCount = await frame.evaluate(async () => {
        if (!("serviceWorker" in navigator)) return 0;
        const regs = await navigator.serviceWorker.getRegistrations();
        return regs.length;
      });
      break;
    } catch {
      // frame still on about:blank; keep polling
    }
  }
  check(
    "does not register inside a preview frame",
    framedCount === 0,
    `frame registrations = ${framedCount}`,
  );

  // 3) Offline navigation still returns a document (cached shell or page).
  await ctx.setOffline(true);
  const offlinePage = await ctx.newPage();
  let offlineOk = false;
  let offlineBody = "";
  try {
    const resp = await offlinePage.goto(`${base}/en`, {
      waitUntil: "domcontentloaded",
      timeout: 8000,
    });
    offlineOk = !!resp;
    offlineBody = (await offlinePage.content()).replace(/\s+/g, " ").slice(0, 80);
  } catch (err) {
    offlineBody = String(err).slice(0, 120);
  }
  check("serves a page while offline", offlineOk, offlineBody);
  await ctx.setOffline(false);
  await ctx.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nAll registration checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
