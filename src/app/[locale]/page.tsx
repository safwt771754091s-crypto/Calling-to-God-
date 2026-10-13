import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getFeaturedVerse, getPlatformStats } from "@/lib/data";
import { localeHref } from "@/components/locale-utils";

export const revalidate = 3600;

const MODULE_ICONS: Record<string, React.ReactNode> = {
  quran: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5A1.5 1.5 0 0 0 20 18.5z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  hadith: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M12 3.5 14.2 8.4l5 .6-3.7 3.5 1 4.9L12 15.1 7.5 17.4l1-4.9L4.8 9l5-.6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  biography: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 4c2.5 2.2 2.5 13.8 0 16M12 4c-2.5 2.2-2.5 13.8 0 16M4.5 9.5h15M4.5 14.5h15" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  ),
  qa: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H9l-4 4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9.5 9.5h5M9.5 12h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  shahada: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M12 3v18M5 8.5l7-4 7 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 21h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = locale as Locale;
  const dict = getDictionary(l);
  const [stats, featured] = await Promise.all([
    getPlatformStats(),
    getFeaturedVerse(l),
  ]);

  const modules = [
    { key: "quran", href: "/quran", title: dict.modules.quranTitle, desc: dict.modules.quranDesc },
    { key: "hadith", href: "/hadith", title: dict.modules.hadithTitle, desc: dict.modules.hadithDesc },
    { key: "biography", href: "/biography", title: dict.modules.biographyTitle, desc: dict.modules.biographyDesc },
    { key: "qa", href: "/qa", title: dict.modules.qaTitle, desc: dict.modules.qaDesc },
    { key: "shahada", href: "/shahada", title: dict.modules.shahadaTitle, desc: dict.modules.shahadaDesc },
  ];

  const statsItems = [
    { label: dict.home.statSurahs, value: stats.surahs },
    { label: dict.home.statVerses, value: stats.verses },
    { label: dict.home.statHadiths, value: stats.hadiths },
    { label: dict.home.statLanguages, value: stats.languages },
  ];

  const trust = [
    dict.footer.sources,
    dict.home.trustTitle,
    dict.qa.aiNote,
  ];

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="hero-emerald relative overflow-hidden">
        <div className="geo-pattern pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden />
        <div className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-[var(--gold)]/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -start-20 bottom-0 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" aria-hidden />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-12 lg:items-center lg:py-28">
          <div className="lg:col-span-7">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-[var(--gold-soft)] backdrop-blur">
              <span className="arabic text-base leading-none">﷽</span>
              <span>{dict.footer.taglineShort}</span>
            </span>
            <h1
              className="animate-fade-up mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              {dict.home.heroTitle}
            </h1>
            <p
              className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-white/85"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              {dict.home.heroSubtitle}
            </p>
            <div
              className="animate-fade-up mt-9 flex flex-wrap gap-3"
              style={{ "--i": 3 } as React.CSSProperties}
            >
              <Link href={localeHref(l, "/quran")} className="btn btn-gold">
                {dict.home.heroCta}
                <span aria-hidden>→</span>
              </Link>
              <Link href={localeHref(l, "/qa")} className="btn btn-onDark">
                {dict.home.heroCtaSecondary}
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
              {statsItems.map((s, i) => (
                <div
                  key={s.label}
                  className="animate-fade-up"
                  style={{ "--i": 4 + i } as React.CSSProperties}
                >
                  <dt className="text-[0.7rem] uppercase tracking-[0.16em] text-white/60">
                    {s.label}
                  </dt>
                  <dd className="font-display text-2xl font-semibold text-white">
                    {s.value.toLocaleString(l)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* verse of the day */}
          {featured && (
            <div className="lg:col-span-5">
              <figure
                className="animate-fade-up relative rounded-[1.6rem] border border-[var(--gold-soft)]/40 bg-[var(--surface)]/95 p-7 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] backdrop-blur"
                style={{ "--i": 2 } as React.CSSProperties}
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="eyebrow">{dict.home.featuredEyebrow}</span>
                  <span className="medallion h-10 w-10 text-sm">
                    {featured.surahNumber}
                  </span>
                </div>
                <blockquote className="quran-text text-[1.5rem] leading-[2.2]">
                  {featured.textAr}
                </blockquote>
                {featured.translation && (
                  <p className="mt-4 text-[0.95rem] leading-relaxed text-[var(--muted-foreground)]">
                    {featured.translation}
                  </p>
                )}
                <figcaption className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs">
                  <span className="font-semibold text-[var(--foreground)]">
                    {dict.common.surah} {featured.surahNumber} · {dict.common.verse}{" "}
                    {featured.verseNumber}
                  </span>
                  <Link
                    href={localeHref(l, `/quran/${featured.surahNumber}`)}
                    className="font-semibold text-[var(--primary)] hover:underline"
                  >
                    {dict.home.featuredReadFull} →
                  </Link>
                </figcaption>
              </figure>
            </div>
          )}
        </div>

        <div className="ornament relative mx-auto max-w-6xl px-4 pb-6 text-xs">
          <span className="arabic whitespace-nowrap">٭</span>
        </div>
      </section>

      {/* ------------------------------------------------------ intro */}
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <span className="eyebrow">{dict.home.introTitle}</span>
          <p className="mt-5 text-lg leading-relaxed text-[var(--muted-foreground)] sm:text-xl">
            {dict.home.introBody}
          </p>
          <div className="mx-auto mt-8 max-w-md gold-rule" />
        </div>
      </section>

      {/* ---------------------------------------------------- modules */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">{dict.common.explore}</span>
            <h2 className="mt-2 text-3xl font-semibold">{dict.home.modulesTitle}</h2>
          </div>
          <Link
            href={localeHref(l, "/quran")}
            className="hidden text-sm font-semibold text-[var(--primary)] hover:underline sm:inline"
          >
            {dict.home.heroCta} →
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <Link
              key={m.key}
              href={localeHref(l, m.href)}
              className={`card-elevated group animate-fade-up relative overflow-hidden p-6 ${
                i === 0 ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""
              }`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="pointer-events-none absolute -end-6 -top-6 h-24 w-24 rounded-full bg-[var(--gold)]/5 transition-transform duration-500 group-hover:scale-125" />
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--primary)]">
                {MODULE_ICONS[m.key]}
              </div>
              <h3 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-[var(--primary)]">
                {m.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {m.desc}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] opacity-0 transition-opacity group-hover:opacity-100">
                {dict.common.readMore} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ trust */}
      <section className="border-t border-[var(--border)] bg-[var(--background-2)]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-3">
          {trust.map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--gold)]/40 bg-[var(--surface)] text-[var(--gold)]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{t}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
