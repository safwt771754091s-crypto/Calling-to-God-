import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/agents/rbac";

/** List connected social accounts and their integration status. */
export async function GET() {
  const staff = await requireRole("EDITOR");
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const accounts = await prisma.socialAccount.findMany({ orderBy: [{ platform: "asc" }, { handle: "asc" }] });
  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      platform: a.platform,
      handle: a.handle,
      displayName: a.displayName,
      credentialEnv: a.credentialEnv,
      // Never expose the token; only whether the referenced env var is set.
      credentialPresent: Boolean(a.credentialEnv && process.env[a.credentialEnv]),
      scopes: a.scopes,
      region: a.region,
      locales: a.locales,
      enabled: a.enabled,
    })),
  });
}

const schema = z.object({
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "X", "TELEGRAM"]),
  handle: z.string().min(1).max(200),
  displayName: z.string().max(200).optional(),
  credentialEnv: z.string().max(100).optional(),
  scopes: z.array(z.string()).optional(),
  region: z.enum(["INDIA", "CHINA", "JAPAN", "GLOBAL"]).optional(),
  locales: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

/** Register or update a connected account. ADMIN only. */
export async function POST(req: Request) {
  const staff = await requireRole("ADMIN");
  if (!staff) return NextResponse.json({ error: "forbidden", required: "ADMIN" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const account = await prisma.socialAccount.upsert({
    where: { platform_handle: { platform: d.platform, handle: d.handle } },
    create: {
      platform: d.platform,
      handle: d.handle,
      displayName: d.displayName,
      credentialEnv: d.credentialEnv,
      scopes: d.scopes ?? [],
      region: d.region ?? "GLOBAL",
      locales: d.locales ?? [],
      enabled: d.enabled ?? false,
    },
    update: {
      displayName: d.displayName,
      credentialEnv: d.credentialEnv,
      scopes: d.scopes,
      region: d.region,
      locales: d.locales,
      enabled: d.enabled,
    },
  });
  return NextResponse.json({ account });
}
