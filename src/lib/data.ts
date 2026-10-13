import prisma from "./db";
import type { Locale } from "@/i18n/config";

/**
 * Run a DB query, returning a fallback when the database is unreachable.
 * Keeps statically-prerendered pages buildable without a live connection;
 * runtime (dynamic) pages never hit the fallback in practice.
 */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[data] query failed:", (err as Error).message);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Quran
// ---------------------------------------------------------------------------
export async function listSurahs() {
  return safe(() => prisma.surah.findMany({ orderBy: { number: "asc" } }), []);
}

export async function getSurahWithVerses(surahNumber: number, locale: Locale) {
  const surah = await safe(
    () => prisma.surah.findUnique({ where: { number: surahNumber } }),
    null,
  );
  if (!surah) return null;
  const verses = await prisma.verse.findMany({
    where: { surahId: surah.id },
    orderBy: { numberInSurah: "asc" },
    include: {
      translations: locale === "ar" ? false : { where: { languageCode: locale } },
      tafsirs: { include: { source: { select: { slug: true, nameEn: true, nameAr: true } } } },
    },
  });
  return { surah, verses };
}

export async function listTafsirSources() {
  return prisma.tafsirSource.findMany({ orderBy: { id: "asc" } });
}

// ---------------------------------------------------------------------------
// Hadith
// ---------------------------------------------------------------------------
export async function listHadithCollections() {
  return prisma.hadithCollection.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { hadiths: true } } },
  });
}

export async function listHadithTopics() {
  return prisma.hadithTopic.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { hadiths: true } } },
  });
}

export interface HadithQuery {
  collection?: string;
  topic?: string;
  grade?: "SAHIH" | "HASAN" | "DAIF" | "UNKNOWN";
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function searchHadith(params: HadithQuery) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, params.pageSize ?? 20);
  const where: Record<string, unknown> = {};
  if (params.collection) where.collection = { slug: params.collection };
  if (params.grade) where.grade = params.grade;
  if (params.topic) where.topics = { some: { slug: params.topic } };
  if (params.q) {
    where.OR = [
      { english: { contains: params.q, mode: "insensitive" } },
      { arabic: { contains: params.q } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.hadith.findMany({
      where,
      orderBy: [{ collectionId: "asc" }, { number: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        collection: { select: { slug: true, nameEn: true, nameAr: true } },
        book: { select: { nameEn: true, number: true } },
        topics: true,
      },
    }),
    prisma.hadith.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

// ---------------------------------------------------------------------------
// Biography
// ---------------------------------------------------------------------------
export async function listBiography() {
  return safe(() => prisma.biographyEvent.findMany({ orderBy: { order: "asc" } }), []);
}

// ---------------------------------------------------------------------------
// Shahada track
// ---------------------------------------------------------------------------
export async function listShahadaSteps() {
  return safe(() => prisma.shahadaStep.findMany({ orderBy: { order: "asc" } }), []);
}

// ---------------------------------------------------------------------------
// Q&A
// ---------------------------------------------------------------------------
export async function listQaCategories() {
  return safe(() => prisma.qaCategory.findMany({ orderBy: { id: "asc" } }), []);
}

export async function listPublishedQuestions(locale?: Locale) {
  return safe(
    () =>
      prisma.question.findMany({
        where: { status: "PUBLISHED", ...(locale ? { locale } : {}) },
        orderBy: { createdAt: "desc" },
        include: { category: true },
      }),
    [],
  );
}

export async function listPendingQuestions() {
  return prisma.question.findMany({
    where: { status: { in: ["NEW", "AI_DRAFTED"] } },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });
}

// ---------------------------------------------------------------------------
// Global search (Quran + hadith + surahs)
// ---------------------------------------------------------------------------
export interface SearchResults {
  surahs: Array<{ number: number; nameEn: string; nameAr: string; nameTranslit: string; verseCount: number }>;
  verses: Array<{
    surahNumber: number;
    surahNameEn: string;
    surahNameAr: string;
    numberInSurah: number;
    textAr: string;
    translation: string | null;
  }>;
  hadiths: Array<{
    collectionSlug: string;
    collectionNameEn: string;
    number: number;
    arabic: string;
    english: string | null;
    grade: string;
  }>;
}

export async function searchPlatform(q: string, locale: Locale, limit = 12): Promise<SearchResults> {
  const term = q.trim();
  if (term.length < 2) return { surahs: [], verses: [], hadiths: [] };

  const [surahs, verses, hadiths] = await Promise.all([
    safe(
      () =>
        prisma.surah.findMany({
          where: {
            OR: [
              { nameEn: { contains: term, mode: "insensitive" } },
              { nameTranslit: { contains: term, mode: "insensitive" } },
              { nameAr: { contains: term } },
            ],
          },
          orderBy: { number: "asc" },
          take: limit,
        }),
      [],
    ),
    safe(
      () =>
        prisma.verse.findMany({
          where:
            locale === "ar"
              ? { textAr: { contains: term } }
              : {
                  OR: [
                    { textAr: { contains: term } },
                    { translations: { some: { languageCode: locale, text: { contains: term, mode: "insensitive" } } } },
                  ],
                },
          orderBy: [{ surahId: "asc" }, { numberInSurah: "asc" }],
          take: limit,
          include: {
            surah: { select: { number: true, nameEn: true, nameAr: true } },
            translations: locale === "ar" ? false : { where: { languageCode: locale } },
          },
        }),
      [],
    ),
    safe(
      () =>
        prisma.hadith.findMany({
          where: {
            OR: [
              { english: { contains: term, mode: "insensitive" } },
              { arabic: { contains: term } },
            ],
          },
          orderBy: [{ collectionId: "asc" }, { number: "asc" }],
          take: limit,
          include: { collection: { select: { slug: true, nameEn: true } } },
        }),
      [],
    ),
  ]);

  return {
    surahs: surahs.map((s) => ({
      number: s.number,
      nameEn: s.nameEn,
      nameAr: s.nameAr,
      nameTranslit: s.nameTranslit,
      verseCount: s.verseCount,
    })),
    verses: verses.map((v) => ({
      surahNumber: v.surah.number,
      surahNameEn: v.surah.nameEn,
      surahNameAr: v.surah.nameAr,
      numberInSurah: v.numberInSurah,
      textAr: v.textAr,
      translation: v.translations?.[0]?.text ?? null,
    })),
    hadiths: hadiths.map((h) => ({
      collectionSlug: h.collection.slug,
      collectionNameEn: h.collection.nameEn,
      number: h.number,
      arabic: h.arabic,
      english: h.english,
      grade: h.grade,
    })),
  };
}

/** Fetch a single hadith by collection slug + number (for permalinks). */
export async function getHadithByRef(collectionSlug: string, number: number) {
  return safe(
    () =>
      prisma.hadith.findFirst({
        where: { collection: { slug: collectionSlug }, number },
        include: {
          collection: { select: { slug: true, nameEn: true, nameAr: true, author: true } },
          book: { select: { nameEn: true, number: true } },
          topics: true,
        },
      }),
    null,
  );
}

// ---------------------------------------------------------------------------
// Platform stats (home page)
// ---------------------------------------------------------------------------
export async function getPlatformStats() {
  const [surahs, verses, hadiths, languages] = await Promise.all([
    safe(() => prisma.surah.count(), 0),
    safe(() => prisma.verse.count(), 0),
    safe(() => prisma.hadith.count(), 0),
    safe(() => prisma.translationLanguage.count(), 0),
  ]);
  return { surahs, verses, hadiths, languages };
}

/** A stable "verse of the day": one of a curated set, rotating by date. */
export async function getFeaturedVerse(locale: Locale) {
  const refs: Array<{ surah: number; verse: number }> = [
    { surah: 2, verse: 255 },
    { surah: 24, verse: 35 },
    { surah: 55, verse: 13 },
    { surah: 17, verse: 82 },
    { surah: 13, verse: 28 },
    { surah: 39, verse: 53 },
    { surah: 2, verse: 186 },
    { surah: 3, verse: 139 },
    { surah: 65, verse: 3 },
    { surah: 94, verse: 5 },
    { surah: 14, verse: 7 },
    { surah: 16, verse: 90 },
  ];
  const dayIndex = Math.floor(Date.now() / 86_400_000) % refs.length;
  const ref = refs[dayIndex];

  const surah = await safe(
    () => prisma.surah.findUnique({ where: { number: ref.surah } }),
    null,
  );
  if (!surah) return null;
  const verse = await safe(
    () =>
      prisma.verse.findFirst({
        where: { surahId: surah.id, numberInSurah: ref.verse },
        include: {
          translations: locale === "ar" ? false : { where: { languageCode: locale } },
        },
      }),
    null,
  );
  if (!verse) return null;
  return {
    surahNumber: surah.number,
    surahNameEn: surah.nameEn,
    surahNameAr: surah.nameAr,
    verseNumber: verse.numberInSurah,
    textAr: verse.textAr,
    translation: verse.translations?.[0]?.text ?? null,
    translator: verse.translations?.[0]?.author ?? null,
  };
}
