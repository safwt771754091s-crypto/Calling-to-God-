import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { isLocale } from "@/i18n/config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  language: z.string().optional(),
  message: z.string().min(2).max(4000),
});

export async function POST(req: Request) {
  const limited = rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60_000);
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
  const { name, email, language = "en", message } = parsed.data;
  const row = await prisma.contactRequest.create({
    data: { name, email, language: isLocale(language) ? language : "en", message },
  });
  return NextResponse.json({ id: row.id, status: "received" }, { status: 201 });
}
