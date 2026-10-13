import { NextResponse } from "next/server";
import { listPublishedQuestions } from "@/lib/data";
import { isLocale } from "@/i18n/config";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const localeParam = url.searchParams.get("locale");
  const locale = localeParam && isLocale(localeParam) ? localeParam : undefined;
  const questions = await listPublishedQuestions(locale);
  return NextResponse.json({
    questions: questions.map((q) => ({
      id: q.id,
      body: q.body,
      locale: q.locale,
      category: q.category?.nameEn ?? null,
      answerEn: q.answerEn,
      answerAr: q.answerAr,
      reviewedAt: q.reviewedAt,
    })),
  });
}
