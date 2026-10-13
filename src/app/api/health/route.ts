import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { activeProvider, activeModel } from "@/lib/ai";

export async function GET() {
  try {
    const [surahs, verses, hadiths] = await Promise.all([
      prisma.surah.count(),
      prisma.verse.count(),
      prisma.hadith.count(),
    ]);
    return NextResponse.json({
      status: "ok",
      db: "connected",
      counts: { surahs, verses, hadiths },
      ai: { provider: activeProvider(), model: activeModel() },
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "unavailable", error: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }
}
