import "dotenv/config";
import prisma from "../src/lib/db";
import { AGENT_REGISTRY } from "../src/lib/agents/types";
import { REGION_STRATEGIES } from "../src/lib/agents/regions";
import { PUBLISHING_ENABLED_KEY } from "../src/lib/agents/publisher";

/**
 * Idempotent seed for the AI dawah-agent platform: the agent registry, the
 * region campaigns (India/China/Japan/Global) and the integration placeholders
 * for social accounts. Safe to re-run — everything upserts by slug/handle.
 *
 * Social accounts are seeded DISABLED with only the *name* of the env var that
 * would hold their token; no secret is ever stored here.
 */
async function main() {
  console.log("→ Agents registry…");
  for (const a of AGENT_REGISTRY) {
    await prisma.agent.upsert({
      where: { slug: a.slug },
      create: {
        slug: a.slug,
        kind: a.kind,
        nameEn: a.nameEn,
        nameAr: a.nameAr,
        description: a.description,
        status: "ACTIVE",
      },
      update: { nameEn: a.nameEn, nameAr: a.nameAr, description: a.description, kind: a.kind },
    });
  }

  console.log("→ Region campaigns…");
  for (const s of Object.values(REGION_STRATEGIES)) {
    await prisma.campaign.upsert({
      where: { slug: s.region.toLowerCase() },
      create: {
        slug: s.region.toLowerCase(),
        nameEn: `${s.nameEn} outreach`,
        nameAr: `حملة ${s.nameAr}`,
        region: s.region,
        locales: s.locales,
        theme: s.themes[0],
        active: true,
      },
      update: { nameEn: `${s.nameEn} outreach`, nameAr: `حملة ${s.nameAr}`, locales: s.locales },
    });
  }

  console.log("→ Social account placeholders…");
  const accounts = [
    { platform: "FACEBOOK", handle: "@trupath", credentialEnv: "FACEBOOK_PAGE_TOKEN", scopes: ["pages_manage_posts"], region: "GLOBAL", locales: ["en", "ar"] },
    { platform: "TELEGRAM", handle: "@trupath", credentialEnv: "TELEGRAM_BOT_TOKEN", scopes: ["sendMessage"], region: "GLOBAL", locales: ["en", "ar", "ru"] },
    { platform: "X", handle: "@trupath", credentialEnv: "X_API_TOKEN", scopes: [], region: "GLOBAL", locales: ["en"] },
    { platform: "YOUTUBE", handle: "@trupath", credentialEnv: "YOUTUBE_API_TOKEN", scopes: [], region: "GLOBAL", locales: ["en"] },
  ] as const;
  for (const a of accounts) {
    await prisma.socialAccount.upsert({
      where: { platform_handle: { platform: a.platform, handle: a.handle } },
      create: {
        platform: a.platform,
        handle: a.handle,
        credentialEnv: a.credentialEnv,
        scopes: [...a.scopes],
        region: a.region,
        locales: [...a.locales],
        enabled: false,
      },
      update: { credentialEnv: a.credentialEnv, scopes: [...a.scopes] },
    });
  }

  console.log("→ Publishing kill switch (default OFF)…");
  await prisma.platformConfig.upsert({
    where: { key: PUBLISHING_ENABLED_KEY },
    create: { key: PUBLISHING_ENABLED_KEY, value: "false" },
    update: {},
  });

  console.log("✔ Agent platform seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
