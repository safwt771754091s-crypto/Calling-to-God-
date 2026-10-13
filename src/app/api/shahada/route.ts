import { NextResponse } from "next/server";
import { listShahadaSteps } from "@/lib/data";

export async function GET() {
  const steps = await listShahadaSteps();
  return NextResponse.json({ steps });
}
