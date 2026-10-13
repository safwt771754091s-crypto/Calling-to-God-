import "dotenv/config";
import prisma from "../../src/lib/db";
import { fetchJson } from "./util";

interface QuranVerse {
  chapter: number;
  verse: number;
  text: string;
}
interface QuranEdition {
  quran: QuranVerse[];
}

interface Chapter {
  id: number;
  name_arabic: string;
  name_simple: string;
  transliteration?: string;
  revelation_place: string;
  verses_count: number;
}

const FW = "https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions";

// Non-Chinese translations come from fawazahmed0 (parallel verse lists keyed by
// chapter:verse). Chinese comes from quran.com (Ma Jian, resource 56).
const TRANSLATIONS: {
  code: string;
  author: string;
  source: "fawazahmed0" | "qurancom";
  ref?: string;
  qurancomId?: number;
}[] = [
  { code: "en", author: "Abdullah Yusuf Ali", source: "fawazahmed0", ref: "eng-abdullahyusufal" },
  { code: "ru", author: "Elmir Kuliev", source: "fawazahmed0", ref: "rus-elmirkuliev" },
  { code: "hi", author: "Maulana Azizul Haque al-Umari", source: "fawazahmed0", ref: "hin-maulanaazizulha" },
  { code: "ja", author: "Ryoichi Mita", source: "fawazahmed0", ref: "jpn-ryoichimita" },
  { code: "zh", author: "Ma Jian", source: "qurancom", qurancomId: 56 },
];

const LANGUAGES = [
  { code: "ar", nameAr: "العربية", nameEn: "Arabic", direction: "rtl" },
  { code: "en", nameAr: "الإنجليزية", nameEn: "English", direction: "ltr" },
  { code: "zh", nameAr: "الصينية", nameEn: "Chinese", direction: "ltr" },
  { code: "hi", nameAr: "الهندية", nameEn: "Hindi", direction: "ltr" },
  { code: "ja", nameAr: "اليابانية", nameEn: "Japanese", direction: "ltr" },
  { code: "ru", nameAr: "الروسية", nameEn: "Russian", direction: "ltr" },
];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  console.log("→ Seeding languages…");
  for (const l of LANGUAGES) {
    await prisma.translationLanguage.upsert({
      where: { code: l.code },
      create: l,
      update: { nameAr: l.nameAr, nameEn: l.nameEn, direction: l.direction },
    });
  }

  console.log("→ Fetching Arabic (Uthmani) text…");
  const arabic = await fetchJson<QuranEdition>(`${FW}/ara-quranuthmanihaf.json`, "ara.json");

  console.log("→ Fetching chapter metadata…");
  const chaptersRes = await fetchJson<{ chapters: Chapter[] }>(
    "https://api.quran.com/api/v4/chapters?language=en",
    "chapters.json",
  );
  const chapters = chaptersRes.chapters;

  console.log("→ Upserting 114 surahs…");
  for (const c of chapters) {
    const revelation = c.revelation_place === "makkah" ? "Meccan" : "Medinan";
    await prisma.surah.upsert({
      where: { number: c.id },
      create: {
        number: c.id,
        nameAr: c.name_arabic,
        nameEn: c.name_simple,
        nameTranslit: c.transliteration ?? c.name_simple,
        revelation,
        verseCount: c.verses_count,
      },
      update: {
        nameAr: c.name_arabic,
        nameEn: c.name_simple,
        nameTranslit: c.transliteration ?? c.name_simple,
        revelation,
        verseCount: c.verses_count,
      },
    });
  }
  const surahs = await prisma.surah.findMany({ select: { id: true, number: true } });
  const surahIdByNumber = new Map(surahs.map((s) => [s.number, s.id]));

  console.log(`→ Inserting ${arabic.quran.length} verses…`);
  const existing = await prisma.verse.count();
  if (existing === 0) {
    const rows = arabic.quran.map((v, i) => ({
      surahId: surahIdByNumber.get(v.chapter)!,
      number: i + 1,
      numberInSurah: v.verse,
      textAr: v.text,
    }));
    for (const part of chunk(rows, 1000)) {
      await prisma.verse.createMany({ data: part });
    }
  } else {
    console.log(`   (${existing} verses already present, skipping)`);
  }

  console.log("→ Loading verse id map…");
  const verses = await prisma.verse.findMany({
    select: { id: true, numberInSurah: true, surah: { select: { number: true } } },
  });
  const verseIdByKey = new Map<string, number>();
  for (const v of verses) verseIdByKey.set(`${v.surah.number}:${v.numberInSurah}`, v.id);

  for (const t of TRANSLATIONS) {
    console.log(`→ Translation [${t.code}] ${t.author}…`);
    const map = new Map<string, string>();

    if (t.source === "fawazahmed0") {
      const data = await fetchJson<QuranEdition>(`${FW}/${t.ref}.json`, `${t.ref}.json`);
      for (const v of data.quran) map.set(`${v.chapter}:${v.verse}`, v.text);
    } else {
      for (const c of chapters) {
        const res = await fetchJson<{ translations: { text: string }[] }>(
          `https://api.quran.com/api/v4/quran/translations/${t.qurancomId}?chapter_number=${c.id}`,
          `qurancom-${t.qurancomId}-${c.id}.json`,
        );
        res.translations.forEach((row, idx) => {
          map.set(`${c.id}:${idx + 1}`, row.text);
        });
      }
    }

    const rows: { verseId: number; languageCode: string; author: string; text: string }[] = [];
    for (const [key, text] of map) {
      const verseId = verseIdByKey.get(key);
      if (verseId && text) {
        rows.push({ verseId, languageCode: t.code, author: t.author, text });
      }
    }
    // Idempotent: replace this (language, author) set.
    await prisma.translation.deleteMany({ where: { languageCode: t.code, author: t.author } });
    for (const part of chunk(rows, 1000)) {
      await prisma.translation.createMany({ data: part, skipDuplicates: true });
    }
    console.log(`   inserted ${rows.length}`);
  }

  console.log("✔ Quran seeding complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
