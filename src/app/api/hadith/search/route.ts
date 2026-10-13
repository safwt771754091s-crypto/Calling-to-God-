import { NextResponse } from "next/server";
import { searchHadith } from "@/lib/data";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const collection = url.searchParams.get("collection") ?? undefined;
  const topic = url.searchParams.get("topic") ?? undefined;
  const gradeParam = url.searchParams.get("grade") ?? undefined;
  const grade =
    gradeParam && ["SAHIH", "HASAN", "DAIF", "UNKNOWN"].includes(gradeParam)
      ? (gradeParam as "SAHIH" | "HASAN" | "DAIF" | "UNKNOWN")
      : undefined;
  const page = Number(url.searchParams.get("page") ?? 1) || 1;
  const pageSize = Number(url.searchParams.get("pageSize") ?? 20) || 20;

  const results = await searchHadith({ q, collection, topic, grade, page, pageSize });
  return NextResponse.json(results);
}
