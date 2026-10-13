import prisma from "@/lib/db";

/** Append an immutable audit entry. Never throws into the caller's path. */
export async function recordAudit(entry: {
  actorId?: string | null;
  actorType?: "user" | "agent" | "system";
  action: string;
  entityType: string;
  entityId?: string | null;
  agentId?: string | null;
  contentId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorType: entry.actorType ?? "system",
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        agentId: entry.agentId ?? null,
        contentId: entry.contentId ?? null,
        detail: (entry.detail ?? undefined) as never,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record:", (err as Error).message);
  }
}
