import { describe, it, expect, afterAll, beforeAll } from "vitest";
import prisma from "./db";
import {
  getPlatformStats,
  listSurahs,
  getSurahWithVerses,
  searchPlatform,
  searchHadith,
  getHadithByRef,
  listHadithCollections,
} from "./data";

/**
 * These exercise the real Postgres content store, so they only run when a
 * DATABASE_URL is present (locally and in CI with the db service). Assertions
 * are structural — the platform is seeded and queries return well-formed rows —
 * not that any particular translation text is "correct", which is a scholarly,
 * not a programmatic, judgement.
 *
 * The Quran is always required (CI ingests it). Hadith checks are skipped when
 * the large hadith corpus has not been imported in this environment.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const suite = describe.skipIf(!hasDb);

let stats: Awaited<ReturnType<typeof getPlatformStats>>;
let hadithSeeded = false;

suite("content store (integration)", () => {
  beforeAll(async () => {
    stats = await getPlatformStats();
    hadithSeeded = stats.hadiths > 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("has the full Quran seeded (114 surahs / 6236 verses)", () => {
    expect(stats.surahs).toBe(114);
    expect(stats.verses).toBe(6236);
    expect(stats.languages).toBeGreaterThanOrEqual(5);
  });

  it("lists all 114 surahs in order", async () => {
    const surahs = await listSurahs();
    expect(surahs).toHaveLength(114);
    expect(surahs[0].number).toBe(1);
    expect(surahs[113].number).toBe(114);
  });

  it("returns a surah with verses and translations", async () => {
    const data = await getSurahWithVerses(2, "en");
    expect(data).not.toBeNull();
    expect(data!.verses.length).toBe(286);
    const withTranslation = data!.verses.find((v) => (v.translations?.length ?? 0) > 0);
    expect(withTranslation).toBeTruthy();
  });

  it("short-circuits a too-short search term", async () => {
    const results = await searchPlatform("a", "en");
    expect(results).toEqual({ surahs: [], verses: [], hadiths: [] });
  });

  it("finds Quran verses for a real term", async () => {
    const results = await searchPlatform("mercy", "en");
    expect(results.verses.length + results.surahs.length).toBeGreaterThan(0);
  });

  it("resolves a hadith permalink by collection slug and number", async () => {
    if (!hadithSeeded) return;
    const collections = await listHadithCollections();
    expect(collections.length).toBeGreaterThan(0);
    const slug = collections[0].slug;
    const hadith = await getHadithByRef(slug, 1);
    expect(hadith).not.toBeNull();
    expect(hadith!.collection.slug).toBe(slug);
    expect(hadith!.number).toBe(1);
    expect(hadith!.arabic.length).toBeGreaterThan(0);
  });

  it("paginates hadith search results", async () => {
    if (!hadithSeeded) return;
    const page1 = await searchHadith({ page: 1, pageSize: 5 });
    expect(page1.items).toHaveLength(5);
    expect(page1.total).toBeGreaterThan(5);
    expect(page1.page).toBe(1);
  });
});
