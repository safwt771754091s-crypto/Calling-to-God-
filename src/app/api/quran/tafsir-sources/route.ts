import { NextResponse } from "next/server";
import { listTafsirSources } from "@/lib/data";

export async function GET() {
  const sources = await listTafsirSources();
  return NextResponse.json({ sources });
}
