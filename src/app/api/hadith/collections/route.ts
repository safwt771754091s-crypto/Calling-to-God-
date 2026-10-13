import { NextResponse } from "next/server";
import { listHadithCollections, listHadithTopics } from "@/lib/data";

export async function GET() {
  const [collections, topics] = await Promise.all([
    listHadithCollections(),
    listHadithTopics(),
  ]);
  return NextResponse.json({ collections, topics });
}
