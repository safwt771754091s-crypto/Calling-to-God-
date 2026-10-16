import { describe, it, expect, afterAll } from "vitest";
import prisma from "@/lib/db";
import { generateContent, setContentApproval } from "./orchestrator";
import { publishContent, isPublishingEnabled } from "./publisher";
import { roleAtLeast } from "./roles";

const hasDb = Boolean(process.env.DATABASE_URL);
const suite = describe.skipIf(!hasDb);

describe("rbac", () => {
  it("ranks roles correctly", () => {
    expect(roleAtLeast("ADMIN", "SCHOLAR")).toBe(true);
    expect(roleAtLeast("SCHOLAR", "SCHOLAR")).toBe(true);
    expect(roleAtLeast("EDITOR", "SCHOLAR")).toBe(false);
    expect(roleAtLeast(undefined, "EDITOR")).toBe(true);
    expect(roleAtLeast("EDITOR", "ADMIN")).toBe(false);
  });
});

suite("agent pipeline (integration)", () => {
  const createdContent: string[] = [];
  let reviewerId = "";

  afterAll(async () => {
    await prisma.publication.deleteMany({ where: { contentId: { in: createdContent } } });
    await prisma.contentItem.deleteMany({ where: { id: { in: createdContent } } });
    if (reviewerId) await prisma.user.delete({ where: { id: reviewerId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("generates a grounded draft held for human review (never auto-published)", async () => {
    const user = await prisma.user.upsert({
      where: { email: "agent-test-reviewer@trupath.local" },
      create: { email: "agent-test-reviewer@trupath.local", name: "Test Reviewer", passwordHash: "x", role: "SCHOLAR" },
      update: { role: "SCHOLAR" },
    });
    reviewerId = user.id;

    const result = await generateContent({
      topic: "mercy and forgiveness",
      locale: "en",
      region: "GLOBAL",
      contentType: "SOCIAL_POST",
    });
    createdContent.push(result.contentId);
    expect(result.status).toBe("SCHOLAR_REVIEW");
    expect(result.requiresHuman).toBe(true);

    const row = await prisma.contentItem.findUnique({ where: { id: result.contentId } });
    expect(row?.status).toBe("SCHOLAR_REVIEW");
    expect(row?.approvedById).toBeNull();
  });

  it("moves to APPROVED only through a human reviewer", async () => {
    const id = createdContent[0];
    const { status } = await setContentApproval({ contentId: id, approved: true, reviewerId });
    expect(status).toBe("APPROVED");
    const row = await prisma.contentItem.findUnique({ where: { id } });
    expect(row?.approvedById).toBe(reviewerId);
    expect(row?.approvedAt).toBeInstanceOf(Date);
  });

  it("refuses to publish while the kill switch is off", async () => {
    expect(await isPublishingEnabled()).toBe(false);
    const outcome = await publishContent(createdContent[0], "FACEBOOK");
    expect(outcome.ok).toBe(false);
    expect(outcome.status).toBe("BLOCKED");
    expect(outcome.reason).toBe("publishing_disabled");
  });

  it("keeps a single publication row per content/platform/locale (no duplicates)", async () => {
    await publishContent(createdContent[0], "FACEBOOK");
    await publishContent(createdContent[0], "FACEBOOK");
    const rows = await prisma.publication.findMany({ where: { contentId: createdContent[0], platform: "FACEBOOK" } });
    expect(rows).toHaveLength(1);
  });

  it("blocks publishing for content that is not approved", async () => {
    const draft = await generateContent({
      topic: "charity",
      locale: "en",
      region: "GLOBAL",
      contentType: "SOCIAL_POST",
    });
    createdContent.push(draft.contentId);
    const outcome = await publishContent(draft.contentId, "TELEGRAM");
    expect(outcome.status).toBe("BLOCKED");
    expect(["publishing_disabled", "content_not_approved"]).toContain(outcome.reason);
  });
});
