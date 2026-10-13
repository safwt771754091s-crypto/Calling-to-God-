import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { generateAnswerDraft } from "@/lib/ai";
import { isLocale } from "@/i18n/config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  body: z.string().min(5).max(4000),
  locale: z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  visitorName: z.string().max(200).optional(),
  visitorEmail: z.string().email().optional(),
});

export async function POST(req: Request) {
  const limited = rateLimit(`qa:${clientIp(req)}`, 5, 10 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: limited.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { body, locale = "en", categoryId, visitorName, visitorEmail } = parsed.data;

  const question = await prisma.question.create({
    data: {
      body,
      locale: isLocale(locale) ? locale : "en",
      categoryId: categoryId ?? null,
      visitorName: visitorName ?? null,
      visitorEmail: visitorEmail ?? null,
      status: "NEW",
    },
  });

  try {
    const draft = await generateAnswerDraft(body, question.locale);
    await prisma.question.update({
      where: { id: question.id },
      data: {
        aiDraft: draft.draft,
        aiConfidence: draft.confidence,
        aiProvider: draft.provider,
        aiModel: draft.model,
        status: "AI_DRAFTED",
      },
    });
  } catch (err) {
    console.error("AI draft failed", err);
  }

  // The visitor never sees the raw AI text; a scholar approves before publishing.
  return NextResponse.json(
    { id: question.id, status: "submitted", message: "Your question was received and awaits review." },
    { status: 201 },
  );
}
