import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { isLocale, defaultLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getSurahWithVerses } from "@/lib/data";
import { localeHref } from "@/components/locale-utils";
import { SurahReader } from "@/components/surah-reader";
import { languageAlternates } from "@/lib/site";

export function generateStaticParams() {
  const out: { locale: string; surah: string }[] = [];
  for (const locale of locales) {
    for (let n = 1; n <= 114; n++) out.push({ locale, surah: String(n) });
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; surah: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, surah: surahParam } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const num = Number(surahParam);
  if (!Number.isInteger(num) || num < 1 || num > 114) return {};
  const data = await getSurahWithVerses(num, locale);
  if (!data) return {};
  const title = `${data.surah.nameEn} (${data.surah.nameAr})`;
  const description = `${data.surah.nameTranslit} — ${data.surah.verseCount} verses. Read the Arabic text with translations and tafsir.`;
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/quran/${num}`, languages: languageAlternates(`quran/${num}`) },
    openGraph: { title, description, type: "article" },
  };
}

export default async function SurahPage({
  params,
}: {
  params: Promise<{ locale: string; surah: string }>;
}) {
  const { locale: rawLocale, surah: surahParam } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const num = Number(surahParam);
  if (!Number.isInteger(num) || num < 1 || num > 114) notFound();

  const dict = getDictionary(locale);
  const data = await getSurahWithVerses(num, locale);
  if (!data) notFound();

  const verses = data.verses.map((v) => ({
    id: v.id,
    numberInSurah: v.numberInSurah,
    textAr: v.textAr,
    translations: (v.translations ?? []).map((t) => ({ text: t.text, author: t.author })),
    tafsirs: v.tafsirs.map((t) => ({
      id: t.id,
      text: t.text,
      source: { slug: t.source.slug, nameEn: t.source.nameEn, nameAr: t.source.nameAr },
    })),
  }));

  const prev = num > 1 ? num - 1 : null;
  const next = num < 114 ? num + 1 : null;
  const backHref = localeHref(locale, "/quran");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-6 flex items-center justify-between text-sm">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 font-medium text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
        >
          <span aria-hidden>←</span> {dict.nav.quran}
        </Link>
        <span className="text-xs text-[var(--muted-foreground)]">
          {dict.common.surah} {num} / 114
        </span>
      </nav>

      <header className="hero-emerald relative mb-10 overflow-hidden rounded-[1.6rem] px-6 py-10 text-center">
        <div className="geo-pattern pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden />
        <div className="relative">
          <span className="medallion mx-auto mb-4 h-14 w-14 text-lg">{num}</span>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">
            {data.surah.revelation === "Meccan" ? dict.quran.meccan : dict.quran.medinan} ·{" "}
            {data.surah.verseCount} {dict.common.verses}
          </p>
          <h1 className="arabic mt-3 text-4xl font-bold">{data.surah.nameAr}</h1>
          <p className="mt-2 text-lg text-white/85">{data.surah.nameEn}</p>
        </div>
      </header>

      <SurahReader
        locale={locale}
        dict={dict}
        surahNumber={num}
        surahName={data.surah.nameEn}
        verses={verses}
      />

      <nav className="mt-12 grid grid-cols-2 gap-3">
        {prev ? (
          <Link
            href={localeHref(locale, `/quran/${prev}`)}
            className="card flex flex-col gap-1 p-4 transition hover:border-[var(--gold)]/60"
          >
            <span className="text-xs text-[var(--muted-foreground)]">← {dict.common.surah}</span>
            <span className="font-semibold">{prev}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={localeHref(locale, `/quran/${next}`)}
            className="card flex flex-col items-end gap-1 p-4 text-end transition hover:border-[var(--gold)]/60"
          >
            <span className="text-xs text-[var(--muted-foreground)]">{dict.common.surah} →</span>
            <span className="font-semibold">{next}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
