import { NextResponse } from "next/server";
import { listSurahs } from "@/lib/data";

export async function GET() {
  const surahs = await listSurahs();
  return NextResponse.json({ surahs });
}
