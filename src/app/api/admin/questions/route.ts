import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { auth } from "@/auth";

/** List questions awaiting review (staff). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const questions = await prisma.question.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });
  return NextResponse.json({ questions });
}

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject", "regenerate"]),
  answerEn: z.string().optional(),
  answerAr: z.string().optional(),
});

/** Approve (publish), reject, or regenerate the AI draft. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { id, action, answerEn, answerAr } = parsed.data;

  if (action === "approve") {
    const q = await prisma.question.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        answerEn: answerEn ?? undefined,
        answerAr: answerAr ?? undefined,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json({ question: q });
  }

  if (action === "reject") {
    const q = await prisma.question.update({ where: { id }, data: { status: "REJECTED" } });
    return NextResponse.json({ question: q });
  }

  // regenerate
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { generateAnswerDraft } = await import("@/lib/ai");
  const draft = await generateAnswerDraft(existing.body, existing.locale);
  const q = await prisma.question.update({
    where: { id },
    data: {
      aiDraft: draft.draft,
      aiConfidence: draft.confidence,
      aiProvider: draft.provider,
      aiModel: draft.model,
      status: "AI_DRAFTED",
    },
  });
  return NextResponse.json({ question: q });
}
