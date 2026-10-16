import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/agents/rbac";
import { isPublishingEnabled, setPublishingEnabled, publishContent } from "@/lib/agents/publisher";
import { recordAudit } from "@/lib/agents/audit";

export async function GET() {
  const staff = await requireRole("EDITOR");
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ publishingEnabled: await isPublishingEnabled() });
}

const schema = z.object({
  action: z.enum(["enable", "disable", "publish"]),
  contentId: z.string().optional(),
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "X", "TELEGRAM"]).optional(),
  accountId: z.string().optional(),
});

/**
 * Kill switch + manual publish. Only ADMIN may change the switch or trigger a
 * publish. Publishing is a no-op unless the switch is ON and the content is
 * human-approved.
 */
export async function POST(req: Request) {
  const staff = await requireRole("ADMIN");
  if (!staff) return NextResponse.json({ error: "forbidden", required: "ADMIN" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { action, contentId, platform, accountId } = parsed.data;

  if (action === "enable" || action === "disable") {
    const enabled = action === "enable";
    await setPublishingEnabled(enabled);
    await recordAudit({
      actorId: staff.id,
      actorType: "user",
      action: enabled ? "publishing.enabled" : "publishing.disabled",
      entityType: "PlatformConfig",
    });
    return NextResponse.json({ publishingEnabled: enabled });
  }

  if (!contentId || !platform) {
    return NextResponse.json({ error: "contentId and platform are required to publish" }, { status: 400 });
  }
  const outcome = await publishContent(contentId, platform, accountId);
  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 409 });
}
