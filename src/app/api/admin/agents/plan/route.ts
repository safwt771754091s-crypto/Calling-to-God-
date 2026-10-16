import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/agents/rbac";
import { buildPlan, summarizePlan } from "@/lib/agents/planner";
import type { Region } from "@/lib/agents/types";

const regionEnum = z.enum(["INDIA", "CHINA", "JAPAN", "GLOBAL"]);

const schema = z.object({
  period: z.enum(["weekly", "monthly"]).optional(),
  regions: z.array(regionEnum).optional(),
  startDate: z.string().datetime().optional(),
  goals: z.record(z.string(), z.number().positive()).optional(),
});

/** Preview a dawah publishing plan (planner agent). Does not create content. */
export async function POST(req: Request) {
  const staff = await requireRole("EDITOR");
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const plan = buildPlan({
    period: parsed.data.period,
    regions: parsed.data.regions as Region[] | undefined,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    goals: parsed.data.goals,
  });

  return NextResponse.json({ plan, summary: summarizePlan(plan) });
}
