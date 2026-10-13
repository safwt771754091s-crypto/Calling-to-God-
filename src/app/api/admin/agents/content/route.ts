import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/agents/rbac";
import { setContentApproval } from "@/lib/agents/orchestrator";

/** List content items, optionally filtered by status (staff). */
export async function GET(req: Request) {
  const staff = await requireRole("EDITOR");
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const items = await prisma.contentItem.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { campaign: { select: { nameEn: true, region: true } }, approvedBy: { select: { email: true } } },
  });
  return NextResponse.json({ items });
}

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject", "edit"]),
  title: z.string().max(300).optional(),
  body: z.string().max(20000).optional(),
});

/**
 * Human review actions. `approve`/`reject` require SCHOLAR role; `edit` is
 * allowed for any staff but does not change approval status.
 */
export async function PATCH(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { id, action, title, body } = parsed.data;

  if (action === "edit") {
    const staff = await requireRole("EDITOR");
    if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const item = await prisma.contentItem.update({
      where: { id },
      data: { ...(title !== undefined ? { title } : {}), ...(body !== undefined ? { body } : {}) },
    });
    return NextResponse.json({ item });
  }

  const staff = await requireRole("SCHOLAR");
  if (!staff) return NextResponse.json({ error: "forbidden", required: "SCHOLAR" }, { status: 403 });

  const result = await setContentApproval({
    contentId: id,
    approved: action === "approve",
    reviewerId: staff.id,
    edits: { title, body },
  });
  return NextResponse.json(result);
}
