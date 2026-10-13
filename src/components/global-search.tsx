"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { localeHref } from "./locale-utils";
import { GradeBadge } from "./grade-badge";
import type { SearchResults } from "@/lib/data";

const EMPTY: SearchResults = { surahs: [], verses: [], hadiths: [] };

export function GlobalSearch({
  locale,
  dict,
  initialQuery,
}: {
  locale: Locale;
  dict: Dictionary;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<"all" | "quran" | "hadith">("all");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const run = useCallback(
    async (term: string) => {
      const t = term.trim();
      if (t.length < 2) {
        setResults(EMPTY);
        setLoading(false);
        return;
      }
      const id = ++reqId.current;
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(t)}&locale=${locale}`);
        const data = (await res.json()) as SearchResults;
        if (id === reqId.current) setResults(data);
      } catch {
        if (id === reqId.current) setResults(EMPTY);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    const handle = setTimeout(() => void run(query), 250);
    return () => clearTimeout(handle);
  }, [query, run]);

  const scopes: { key: typeof scope; label: string }[] = [
    { key: "all", label: dict.search.all },
    { key: "quran", label: dict.search.quran },
    { key: "hadith", label: dict.search.hadith },
  ];
  const showQuran = scope !== "hadith";
  const showHadith = scope !== "quran";
  const total =
    (showQuran ? results.surahs.length + results.verses.length : 0) +
    (showHadith ? results.hadiths.length : 0);

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="relative mb-6"
      >
        <span className="pointer-events-none absolute inset-y-0 start-4 grid place-items-center text-[var(--muted-foreground)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.search.placeholder}
          aria-label={dict.search.placeholder}
          autoFocus
          className="field ps-12 text-base"
        />
      </form>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {scopes.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setScope(s.key)}
            className={`chip ${scope === s.key ? "chip-active" : ""}`}
          >
            {s.label}
          </button>
        ))}
        <span className="ms-auto text-sm text-[var(--muted-foreground)]">
          {loading ? dict.common.loading : `${total} ${dict.common.results}`}
        </span>
      </div>

      {query.trim().length < 2 ? (
        <p className="card p-10 text-center text-[var(--muted-foreground)]">{dict.search.hint}</p>
      ) : total === 0 && !loading ? (
        <p className="card p-10 text-center text-[var(--muted-foreground)]">
          {dict.search.noResults}
        </p>
      ) : (
        <div className="space-y-10">
          {showQuran && results.surahs.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">{dict.search.surahs}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {results.surahs.map((s) => (
                  <li key={s.number}>
                    <Link
                      href={localeHref(locale, `/quran/${s.number}`)}
                      className="card flex items-center gap-3 p-3 transition hover:border-[var(--gold)]/60"
                    >
                      <span className="medallion h-9 w-9 shrink-0 text-xs font-semibold">
                        {s.number}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {locale === "ar" ? s.nameAr : s.nameEn}
                        </span>
                        <span className="block truncate text-xs text-[var(--muted-foreground)]">
                          {s.nameTranslit} · {s.verseCount} {dict.common.verses}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {showQuran && results.verses.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">{dict.search.verses}</h2>
              <ul className="space-y-3">
                {results.verses.map((v, i) => (
                  <li key={`${v.surahNumber}-${v.numberInSurah}-${i}`} className="card p-4">
                    <Link
                      href={`${localeHref(locale, `/quran/${v.surahNumber}`)}#ayah-${v.numberInSurah}`}
                      className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                      {locale === "ar" ? v.surahNameAr : v.surahNameEn} · {v.surahNumber}:{v.numberInSurah}
                    </Link>
                    <p dir="rtl" className="arabic mt-2 text-lg leading-loose">
                      {v.textAr}
                    </p>
                    {v.translation && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                        {v.translation}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {showHadith && results.hadiths.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">{dict.search.hadith}</h2>
              <ul className="space-y-3">
                {results.hadiths.map((h, i) => (
                  <li key={`${h.collectionSlug}-${h.number}-${i}`} className="card p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <Link
                        href={localeHref(locale, `/hadith/${h.collectionSlug}/${h.number}`)}
                        className="font-semibold hover:text-[var(--primary)]"
                      >
                        {h.collectionNameEn} #{h.number}
                      </Link>
                      <GradeBadge grade={h.grade} locale={locale} />
                    </div>
                    <p dir="rtl" className="arabic text-lg leading-loose">
                      {h.arabic}
                    </p>
                    {h.english && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                        {h.english}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
