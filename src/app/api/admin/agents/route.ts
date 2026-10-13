import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/agents/rbac";
import { AGENT_REGISTRY } from "@/lib/agents/types";
import { REGION_STRATEGIES } from "@/lib/agents/regions";
import { isPublishingEnabled } from "@/lib/agents/publisher";

/** Agent registry status, connected accounts and publishing state. */
export async function GET() {
  const staff = await requireRole("EDITOR");
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [agents, accounts, publishingEnabled, contentCounts, recentPublications] = await Promise.all([
    prisma.agent.findMany({ orderBy: { kind: "asc" } }),
    prisma.socialAccount.findMany({ orderBy: { platform: "asc" } }),
    isPublishingEnabled(),
    prisma.contentItem.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.publication.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return NextResponse.json({
    registry: AGENT_REGISTRY,
    agents,
    accounts,
    publishingEnabled,
    regions: Object.values(REGION_STRATEGIES),
    contentCounts: contentCounts.map((c) => ({ status: c.status, count: c._count._all })),
    recentPublications,
  });
}
