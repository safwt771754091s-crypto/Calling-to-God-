import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { listSurahs } from "@/lib/data";
import { localeHref } from "@/components/locale-utils";
import { SurahIndex } from "@/components/surah-index";

export const revalidate = 3600;

export default async function QuranIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = locale as Locale;
  const dict = getDictionary(l);
  const surahs = await listSurahs();

  const items = surahs.map((s) => ({
    number: s.number,
    nameEn: s.nameEn,
    nameAr: s.nameAr,
    verseCount: s.verseCount,
    revelation: s.revelation,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="relative mb-10 overflow-hidden rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center sm:px-10">
        <div className="geo-pattern pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden />
        <div className="relative">
          <span className="eyebrow">{dict.nav.quran}</span>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{dict.quran.title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">
            {dict.quran.subtitle}
          </p>
        </div>
      </header>

      <SurahIndex locale={l} dict={dict} surahs={items} baseHref={localeHref(l, "/quran")} />
    </div>
  );
}
