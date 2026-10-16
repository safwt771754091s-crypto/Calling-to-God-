import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/agents/rbac";
import { summarize, suggest } from "@/lib/agents/analytics";

export async function GET(req: Request) {
  const staff = await requireRole("EDITOR");
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? 30);
  const summary = await summarize(Number.isFinite(days) ? days : 30);
  return NextResponse.json({ summary, suggestions: suggest(summary) });
}

const schema = z.object({
  campaignId: z.string().optional(),
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "X", "TELEGRAM"]).optional(),
  locale: z.string().optional(),
  region: z.enum(["INDIA", "CHINA", "JAPAN", "GLOBAL"]).optional(),
  kind: z.enum(["REACH", "ENGAGEMENT", "CLICKS", "SITE_VISITS", "FOLLOWERS"]),
  value: z.number().int().nonnegative(),
  source: z.enum(["manual", "platform_api"]).optional(),
});

/** Record a metric value manually (source=manual) when no API is connected. */
export async function POST(req: Request) {
  const staff = await requireRole("EDITOR");
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const metric = await prisma.metric.create({
    data: {
      campaignId: d.campaignId,
      platform: d.platform,
      locale: d.locale,
      region: d.region ?? "GLOBAL",
      kind: d.kind,
      value: d.value,
      source: d.source ?? "manual",
    },
  });
  return NextResponse.json({ metric }, { status: 201 });
}
