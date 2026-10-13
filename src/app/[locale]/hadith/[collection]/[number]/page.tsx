import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getHadithByRef } from "@/lib/data";
import { localeHref } from "@/components/locale-utils";
import { GradeBadge } from "@/components/grade-badge";
import { languageAlternates } from "@/lib/site";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; collection: string; number: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, collection, number } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const num = Number(number);
  if (!Number.isInteger(num)) return {};
  const hadith = await getHadithByRef(collection, num);
  if (!hadith) return {};
  const title = `${hadith.collection.nameEn} #${hadith.number}`;
  const description = (hadith.english ?? hadith.arabic).slice(0, 160);
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/hadith/${collection}/${num}`,
      languages: languageAlternates(`hadith/${collection}/${num}`),
    },
    openGraph: { title, description, type: "article" },
  };
}

export default async function HadithDetailPage({
  params,
}: {
  params: Promise<{ locale: string; collection: string; number: string }>;
}) {
  const { locale: rawLocale, collection, number } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);
  const num = Number(number);
  if (!Number.isInteger(num)) notFound();

  const hadith = await getHadithByRef(collection, num);
  if (!hadith) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-6 flex items-center justify-between text-sm">
        <Link
          href={localeHref(locale, "/hadith")}
          className="inline-flex items-center gap-1.5 font-medium text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
        >
          <span aria-hidden>←</span> {dict.nav.hadith}
        </Link>
        <Link
          href={localeHref(locale, `/hadith?collection=${collection}`)}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)]"
        >
          {locale === "ar" ? hadith.collection.nameAr : hadith.collection.nameEn}
        </Link>
      </nav>

      <header className="hero-emerald relative mb-8 overflow-hidden rounded-[1.6rem] px-6 py-8">
        <div className="geo-pattern pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">
            {locale === "ar" ? hadith.collection.nameAr : hadith.collection.nameEn}
            {hadith.book ? ` · ${hadith.book.nameEn}` : ""}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">#{hadith.number}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <GradeBadge grade={hadith.grade} locale={locale} />
            {hadith.topics.map((t) => (
              <Link
                key={t.id}
                href={localeHref(locale, `/hadith?topic=${t.slug}`)}
                className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/90 hover:bg-white/20"
              >
                {locale === "ar" ? t.nameAr : t.nameEn}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="card-elevated p-6 sm:p-8">
        <p dir="rtl" className="arabic text-xl leading-loose">
          {hadith.arabic}
        </p>
        {hadith.english && (
          <>
            <div className="my-5 gold-rule" />
            <p className="leading-relaxed text-[var(--foreground)]/90">{hadith.english}</p>
          </>
        )}
      </div>

      {hadith.collection.author && (
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          {hadith.collection.author}
        </p>
      )}
    </article>
  );
}
