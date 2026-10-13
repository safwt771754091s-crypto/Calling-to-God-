import { NextResponse } from "next/server";
import { getSurahWithVerses } from "@/lib/data";
import { isLocale, defaultLocale } from "@/i18n/config";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const num = Number(number);
  if (!Number.isInteger(num) || num < 1 || num > 114) {
    return NextResponse.json({ error: "invalid_surah" }, { status: 400 });
  }
  const url = new URL(req.url);
  const localeParam = url.searchParams.get("locale") ?? defaultLocale;
  const locale = isLocale(localeParam) ? localeParam : defaultLocale;

  const data = await getSurahWithVerses(num, locale);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data);
}
