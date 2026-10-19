import "dotenv/config";
import prisma from "../src/lib/db";
import { locales } from "../src/i18n/config";

/**
 * Corpus integrity check. Verifies the seeded Quran/hadith/tafsir data is
 * complete and consistent, and exits non-zero when a threshold is not met.
 * Suitable for CI and for a post-deploy verification step.
 *
 *   tsx scripts/corpus-check.ts            # fail on problems
 *   tsx scripts/corpus-check.ts --warn     # report but exit 0
 */
const warnOnly = process.argv.includes("--warn");

// Canonical expectations for the Uthmani text.
const EXPECTED_SURAHS = 114;
const EXPECTED_VERSES = 6236;

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

async function main() {
  const checks: Check[] = [];

  const surahs = await prisma.surah.count();
  checks.push({
    name: "surahs",
    ok: surahs === EXPECTED_SURAHS,
    detail: `${surahs}/${EXPECTED_SURAHS}`,
  });

  const verses = await prisma.verse.count();
  checks.push({
    name: "verses",
    ok: verses === EXPECTED_VERSES,
    detail: `${verses}/${EXPECTED_VERSES}`,
  });

  // Every verse must belong to a surah and carry an Arabic text.
  const orphanVerses = await prisma.verse.count({ where: { textAr: "" } });
  checks.push({ name: "verses with empty Arabic text", ok: orphanVerses === 0, detail: String(orphanVerses) });

  // Translations for each target locale. Arabic is the source text (stored on
  // Verse.textAr), so it has no separate translation row.
  for (const locale of locales) {
    if (locale === "ar") continue;
    const n = await prisma.translation.count({ where: { languageCode: locale } });
    checks.push({
      name: `translations[${locale}]`,
      ok: n > 0,
      detail: String(n),
    });
  }

  const hadiths = await prisma.hadith.count();
  checks.push({ name: "hadiths", ok: hadiths > 0, detail: String(hadiths) });

  const collections = await prisma.hadithCollection.count();
  checks.push({ name: "hadith collections", ok: collections > 0, detail: String(collections) });

  const tafsirs = await prisma.tafsir.count();
  checks.push({ name: "tafsir entries", ok: tafsirs > 0, detail: String(tafsirs) });

  const tafsirSources = await prisma.tafsirSource.count();
  checks.push({ name: "tafsir sources", ok: tafsirSources > 0, detail: String(tafsirSources) });

  let failed = 0;
  for (const c of checks) {
    if (c.ok) {
      console.log(`  ✓ ${c.name.padEnd(28)} ${c.detail}`);
    } else {
      failed++;
      console.log(`  ✗ ${c.name.padEnd(28)} ${c.detail}`);
    }
  }

  console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
  if (failed > 0 && !warnOnly) {
    console.error("Corpus check failed — content is incomplete.");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
