import "dotenv/config";
import prisma from "../../src/lib/db";
import { fetchJson } from "./util";
import { HadithGrade } from "../../src/generated/prisma/enums";

const BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";

interface RawHadith {
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  grades?: { name: string; grade: string }[];
  reference?: { book: number; hadith: number };
}
interface Edition {
  metadata: { name: string; sections: Record<string, string> };
  hadiths: RawHadith[];
}

const COLLECTIONS = [
  { slug: "bukhari", nameAr: "صحيح البخاري", nameEn: "Sahih al Bukhari", author: "Imam al-Bukhari", rank: 1, defaultGrade: "SAHIH" as HadithGrade },
  { slug: "muslim", nameAr: "صحيح مسلم", nameEn: "Sahih Muslim", author: "Imam Muslim", rank: 2, defaultGrade: "SAHIH" as HadithGrade },
  { slug: "abudawud", nameAr: "سنن أبي داود", nameEn: "Sunan Abu Dawud", author: "Imam Abu Dawud", rank: 3 },
  { slug: "tirmidhi", nameAr: "جامع الترمذي", nameEn: "Jami At Tirmidhi", author: "Imam at-Tirmidhi", rank: 4 },
  { slug: "nasai", nameAr: "سنن النسائي", nameEn: "Sunan an Nasai", author: "Imam an-Nasai", rank: 5 },
  { slug: "ibnmajah", nameAr: "سنن ابن ماجه", nameEn: "Sunan Ibn Majah", author: "Imam Ibn Majah", rank: 6 },
  { slug: "malik", nameAr: "موطأ مالك", nameEn: "Muwatta Malik", author: "Imam Malik", rank: 7 },
  { slug: "nawawi", nameAr: "الأربعون النووية", nameEn: "Forty Hadith of an-Nawawi", author: "Imam an-Nawawi", rank: 8 },
  { slug: "qudsi", nameAr: "الأربعون القدسية", nameEn: "Forty Hadith Qudsi", author: "—", rank: 9 },
  { slug: "dehlawi", nameAr: "أربعون الشاه ولي الله", nameEn: "Forty Hadith of Shah Waliullah Dehlawi", author: "Shah Waliullah Dehlawi", rank: 10 },
];

// Thematic axes (محاور موضوعية) mapped from section/book titles.
const TOPICS = [
  { slug: "faith", nameAr: "الإيمان والعقيدة", nameEn: "Faith & Belief", keywords: ["belief", "faith", "revelation", "tawhid", "creed", "iman"] },
  { slug: "ethics", nameAr: "الأخلاق والآداب", nameEn: "Ethics & Manners", keywords: ["manners", "adab", "virtue", "good", "kindness", "character", "conduct"] },
  { slug: "worship", nameAr: "العبادات", nameEn: "Worship", keywords: ["prayer", "prayers", "fasting", "zakat", "ablution", "purification", "hajj", "pilgrimage", "witr", "tahajjud", "eid"] },
  { slug: "transactions", nameAr: "المعاملات", nameEn: "Transactions", keywords: ["trade", "sales", "business", "debts", "contract", "buyu", "hire", "commerce"] },
  { slug: "human-rights", nameAr: "حقوق الإنسان", nameEn: "Human Rights", keywords: ["rights", "justice", "oppression", "slaves", "manumission", "jihad", "blood"] },
  { slug: "family", nameAr: "الأسرة والمجتمع", nameEn: "Family & Society", keywords: ["marriage", "divorce", "nikah", "family", "women", "children", "widows", "inheritance"] },
  { slug: "knowledge", nameAr: "العلم والتعليم", nameEn: "Knowledge & Learning", keywords: ["knowledge", "knowledge", "education", "learning", "quran", "science"] },
];

function mapGrade(raw: RawHadith["grades"], fallback: HadithGrade = HadithGrade.UNKNOWN): HadithGrade {
  if (!raw || raw.length === 0) return fallback;
  const g = (raw[0].grade || "").toLowerCase();
  if (g.includes("sahih") || g.includes("صحيح")) return HadithGrade.SAHIH;
  if (g.includes("hasan") || g.includes("حسن")) return HadithGrade.HASAN;
  if (g.includes("da") || g.includes("dha") || g.includes("weak") || g.includes("ضعيف")) return HadithGrade.DAIF;
  return fallback;
}

function topicFor(title: string): string | null {
  const t = title.toLowerCase();
  for (const topic of TOPICS) {
    if (topic.keywords.some((k) => t.includes(k))) return topic.slug;
  }
  return null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  console.log("→ Seeding thematic topics…");
  const topicId = new Map<string, number>();
  for (const t of TOPICS) {
    const row = await prisma.hadithTopic.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, nameAr: t.nameAr, nameEn: t.nameEn },
      update: { nameAr: t.nameAr, nameEn: t.nameEn },
    });
    topicId.set(t.slug, row.id);
  }

  const only = process.env.HADITH_COLLECTIONS?.split(",").map((s) => s.trim());
  const selected = only ? COLLECTIONS.filter((c) => only.includes(c.slug)) : COLLECTIONS;

  for (const c of selected) {
    console.log(`→ Collection ${c.nameEn}…`);
    const [ara, eng] = await Promise.all([
      fetchJson<Edition>(`${BASE}/ara-${c.slug}.min.json`, `ara-${c.slug}.json`),
      fetchJson<Edition>(`${BASE}/eng-${c.slug}.min.json`, `eng-${c.slug}.json`),
    ]);

    const collection = await prisma.hadithCollection.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, nameAr: c.nameAr, nameEn: c.nameEn, author: c.author },
      update: { nameAr: c.nameAr, nameEn: c.nameEn, author: c.author },
    });

    // Rebuild idempotently.
    await prisma.hadith.deleteMany({ where: { collectionId: collection.id } });
    await prisma.hadithBook.deleteMany({ where: { collectionId: collection.id } });

    // Books from the English section titles.
    const bookIdByNumber = new Map<number, number>();
    const sectionTitles = eng.metadata.sections;
    for (const [numStr, title] of Object.entries(sectionTitles)) {
      const num = Number(numStr);
      const book = await prisma.hadithBook.create({
        data: {
          collectionId: collection.id,
          number: num,
          nameEn: title || `Book ${num}`,
        },
      });
      bookIdByNumber.set(num, book.id);
    }

    const englishByNumber = new Map<number, RawHadith>();
    for (const h of eng.hadiths) englishByNumber.set(h.hadithnumber, h);

    const rows: {
      collectionId: number;
      bookId: number | null;
      number: number;
      arabic: string;
      english: string | null;
      grade: HadithGrade;
      topics: { connect: { id: number }[] };
    }[] = [];

    for (const h of ara.hadiths) {
      const engH = englishByNumber.get(h.hadithnumber);
      const bookNum = engH?.reference?.book;
      const connect: { id: number }[] = [];
      const tSlug = bookNum != null ? topicFor(sectionTitles[String(bookNum)] ?? "") : null;
      if (tSlug) connect.push({ id: topicId.get(tSlug)! });
      rows.push({
        collectionId: collection.id,
        bookId: bookNum != null ? bookIdByNumber.get(bookNum) ?? null : null,
        number: h.hadithnumber,
        arabic: h.text,
        english: engH?.text ?? null,
        grade: mapGrade(engH?.grades, (c as { defaultGrade?: HadithGrade }).defaultGrade ?? HadithGrade.UNKNOWN),
        topics: { connect },
      });
    }

    for (const part of chunk(rows, 500)) {
      await prisma.hadith.createMany({
        data: part.map((r) => ({
          collectionId: r.collectionId,
          bookId: r.bookId,
          number: r.number,
          arabic: r.arabic,
          english: r.english,
          grade: r.grade,
        })),
        skipDuplicates: true,
      });
    }

    // Assign topics in a second pass via the implicit join table (fast bulk insert).
    const inserted = await prisma.hadith.findMany({
      where: { collectionId: collection.id },
      select: { id: true, number: true },
    });
    const idByNumber = new Map(inserted.map((h) => [h.number, h.id]));
    const joinRows: { a: number; b: number }[] = [];
    for (const r of rows) {
      const id = idByNumber.get(r.number);
      if (!id) continue;
      for (const c of r.topics.connect) joinRows.push({ a: id, b: c.id });
    }
    for (const part of chunk(joinRows, 1000)) {
      const values = part.map((j) => `(${j.a},${j.b})`).join(",");
      await prisma.$executeRawUnsafe(
        `INSERT INTO "_HadithTopics" ("A","B") VALUES ${values} ON CONFLICT DO NOTHING`,
      );
    }
    console.log(`   inserted ${rows.length} hadiths, ${bookIdByNumber.size} books, ${joinRows.length} topic links`);
  }

  console.log("✔ Hadith seeding complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
