"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";

export interface SurahItem {
  number: number;
  nameEn: string;
  nameAr: string;
  verseCount: number;
  revelation: string;
}

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toArabicDigits(n: number) {
  return String(n)
    .split("")
    .map((d) => AR_DIGITS[Number(d)] ?? d)
    .join("");
}

export function SurahIndex({
  locale,
  dict,
  surahs,
  baseHref,
}: {
  locale: Locale;
  dict: Dictionary;
  surahs: SurahItem[];
  baseHref: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "Meccan" | "Medinan">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return surahs.filter((s) => {
      if (filter !== "all" && s.revelation !== filter) return false;
      if (!q) return true;
      return (
        s.nameEn.toLowerCase().includes(q) ||
        s.nameAr.includes(query.trim()) ||
        String(s.number) === q
      );
    });
  }, [surahs, query, filter]);

  return (
    <div>
      <div className="card mb-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-[var(--muted-foreground)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.quran.searchSurah}
            className="field ps-10"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "Meccan", "Medinan"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`chip ${filter === f ? "chip-active" : ""}`}
            >
              {f === "all"
                ? dict.common.all
                : f === "Meccan"
                  ? dict.quran.meccan
                  : dict.quran.medinan}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="card p-10 text-center text-[var(--muted-foreground)]">
          {dict.common.noResults}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => {
            const isRtl = locale === "ar";
            return (
              <li key={s.number} className="animate-fade-up" style={{ "--i": i % 12 } as React.CSSProperties}>
                <Link
                  href={`${baseHref}/${s.number}`}
                  className="card group flex items-center gap-4 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--gold)]/60 hover:shadow-[var(--shadow-md)]"
                >
                  <span className="medallion h-12 w-12 shrink-0 text-base">
                    {isRtl ? toArabicDigits(s.number) : s.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold transition-colors group-hover:text-[var(--primary)]">
                      {isRtl ? s.nameAr : s.nameEn}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <span>
                        {s.verseCount} {dict.quran.verseCountLabel}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                      <span>
                        {s.revelation === "Meccan" ? dict.quran.meccan : dict.quran.medinan}
                      </span>
                    </span>
                  </span>
                  {!isRtl && (
                    <span className="arabic shrink-0 text-lg font-semibold text-[var(--muted-foreground)]">
                      {s.nameAr}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
