import "dotenv/config";
import prisma from "../../src/lib/db";
import { fetchJson } from "./util";

interface TafsirAyah {
  text: string;
}

const BASE = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir";

const SOURCES = [
  {
    slug: "ar-tafsir-ibn-kathir",
    nameAr: "تفسير ابن كثير",
    nameEn: "Tafsir Ibn Kathir",
    author: "Hafiz Ibn Kathir",
  },
  {
    slug: "ar-tafsir-al-tabari",
    nameAr: "جامع البيان — تفسير الطبري",
    nameEn: "Tafsir al-Tabari",
    author: "Imam al-Tabari",
  },
  {
    slug: "ar-tafsir-al-mukhtasar",
    nameAr: "التفسير المختصر",
    nameEn: "Al-Mukhtasar (Concise Tafsir)",
    author: "King Fahd Quran Complex",
  },
];

async function main() {
  const limit = Number(process.env.SURAH_LIMIT ?? 0);
  const surahs = await prisma.surah.findMany({
    orderBy: { number: "asc" },
    take: limit > 0 ? limit : undefined,
    select: { id: true, number: true },
  });

  for (const s of SOURCES) {
    console.log(`→ Tafsir source ${s.nameEn} (${s.slug})…`);
    const source = await prisma.tafsirSource.upsert({
      where: { slug: s.slug },
      create: { ...s, language: "ar" },
      update: { nameAr: s.nameAr, nameEn: s.nameEn, author: s.author },
    });

    // Clear this source and reload (idempotent).
    await prisma.tafsir.deleteMany({ where: { sourceId: source.id } });

    let total = 0;
    for (const surah of surahs) {
      const verses = await prisma.verse.findMany({
        where: { surahId: surah.id },
        orderBy: { numberInSurah: "asc" },
        select: { id: true, numberInSurah: true },
      });
      let data: TafsirAyah[];
      try {
        data = await fetchJson<TafsirAyah[]>(
          `${BASE}/${s.slug}/${surah.number}.json`,
          `${s.slug}-${surah.number}.json`,
        );
      } catch {
        console.warn(`   ! surah ${surah.number} unavailable for ${s.slug}`);
        continue;
      }
      const rows = verses
        .map((v, i) => ({ verseId: v.id, sourceId: source.id, text: data[i]?.text ?? "" }))
        .filter((r) => r.text.trim().length > 0);
      for (let i = 0; i < rows.length; i += 500) {
        await prisma.tafsir.createMany({ data: rows.slice(i, i + 500), skipDuplicates: true });
      }
      total += rows.length;
    }
    console.log(`   inserted ${total} tafsir entries`);
  }

  console.log("✔ Tafsir seeding complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
