import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/agents/rbac";
import { generateContent } from "@/lib/agents/orchestrator";
import { locales } from "@/i18n/config";

const schema = z.object({
  topic: z.string().min(3).max(300),
  locale: z.enum([...locales] as [string, ...string[]]),
  region: z.enum(["INDIA", "CHINA", "JAPAN", "GLOBAL"]),
  contentType: z.enum(["SOCIAL_POST", "VIDEO_SCRIPT", "ARTICLE", "QA", "INVITATION"]),
  campaignId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

/**
 * Run the content pipeline for one item (research -> write -> localize ->
 * review). The result always lands in SCHOLAR_REVIEW (or REJECTED when it is
 * ungrounded religious content); nothing is published here.
 */
export async function POST(req: Request) {
  const staff = await requireRole("EDITOR");
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await generateContent({
      topic: parsed.data.topic,
      locale: parsed.data.locale as (typeof locales)[number],
      region: parsed.data.region,
      contentType: parsed.data.contentType,
      campaignId: parsed.data.campaignId,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "generation_failed", message: (err as Error).message }, { status: 400 });
  }
}
