import { NextResponse } from "next/server";
import { listBiography } from "@/lib/data";

export async function GET() {
  const events = await listBiography();
  return NextResponse.json({ events });
}
