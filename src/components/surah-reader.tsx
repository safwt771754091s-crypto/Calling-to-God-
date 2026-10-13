"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { ayahAudioUrl } from "@/lib/audio";

export interface VerseDTO {
  id: number;
  numberInSurah: number;
  textAr: string;
  translations: { text: string; author: string }[];
  tafsirs: { id: number; text: string; source: { slug: string; nameEn: string; nameAr: string } }[];
}

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toArabicDigits(n: number) {
  return String(n)
    .split("")
    .map((d) => AR_DIGITS[Number(d)] ?? d)
    .join("");
}

const BOOKMARK_KEY = "trupath:bookmarks";
const LASTREAD_KEY = "trupath:lastread";

interface Bookmark {
  surah: number;
  ayah: number;
  surahName: string;
  text: string;
}

function readBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARK_KEY);
    return raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

export function SurahReader({
  locale,
  dict,
  surahNumber,
  surahName,
  verses,
}: {
  locale: Locale;
  dict: Dictionary;
  surahNumber: number;
  surahName: string;
  verses: VerseDTO[];
}) {
  const [showTranslation, setShowTranslation] = useState(locale !== "ar");
  const [tafsirSlug, setTafsirSlug] = useState<string>("none");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(readBookmarks);
  const [playing, setPlaying] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const tafsirSources = Array.from(
    new Map(verses.flatMap((v) => v.tafsirs).map((t) => [t.source.slug, t.source])).values(),
  );

  useEffect(() => {
    window.localStorage.setItem(LASTREAD_KEY, JSON.stringify({ surah: surahNumber, ayah: 1 }));
    const hash = window.location.hash;
    if (/^#ayah-\d+$/.test(hash)) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: "center" });
    }
  }, [surahNumber]);

  const persist = useCallback((next: Bookmark[]) => {
    setBookmarks(next);
    window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
  }, []);

  const toggleBookmark = useCallback(
    (v: VerseDTO) => {
      const exists = bookmarks.some((b) => b.surah === surahNumber && b.ayah === v.numberInSurah);
      persist(
        exists
          ? bookmarks.filter((b) => !(b.surah === surahNumber && b.ayah === v.numberInSurah))
          : [
              { surah: surahNumber, ayah: v.numberInSurah, surahName, text: v.textAr },
              ...bookmarks,
            ],
      );
    },
    [bookmarks, persist, surahNumber, surahName],
  );

  const play = useCallback(
    (v: VerseDTO) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (playing === v.numberInSurah) {
        audio.pause();
        setPlaying(null);
        return;
      }
      audio.src = ayahAudioUrl(surahNumber, v.numberInSurah);
      void audio.play();
      setPlaying(v.numberInSurah);
    },
    [playing, surahNumber],
  );

  const share = useCallback(
    async (v: VerseDTO) => {
      const url = `${window.location.origin}${window.location.pathname}#ayah-${v.numberInSurah}`;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(v.numberInSurah);
        setTimeout(() => setCopied((c) => (c === v.numberInSurah ? null : c)), 1800);
      } catch {
        window.prompt(dict.common.copyLink, url);
      }
    },
    [dict.common.copyLink],
  );

  const isBookmarked = (ayah: number) =>
    bookmarks.some((b) => b.surah === surahNumber && b.ayah === ayah);

  return (
    <div>
      <div className="sticky top-[4.25rem] z-20 mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-[var(--shadow-sm)] backdrop-blur">
        {locale !== "ar" && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showTranslation}
              onChange={(e) => setShowTranslation(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            {dict.quran.showTranslation}
          </label>
        )}
        {tafsirSources.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted-foreground)]">{dict.quran.readTafsir}:</span>
            <select
              value={tafsirSlug}
              onChange={(e) => setTafsirSlug(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
            >
              <option value="none">—</option>
              {tafsirSources.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {locale === "ar" ? s.nameAr : s.nameEn}
                </option>
              ))}
            </select>
          </label>
        )}
        {bookmarks.length > 0 && (
          <span className="ms-auto inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]">
            <span aria-hidden>★</span> {bookmarks.length} {dict.common.bookmarks}
          </span>
        )}
      </div>

      <ol className="space-y-3">
        {verses.map((v) => {
          const tafsir =
            tafsirSlug !== "none" ? v.tafsirs.find((t) => t.source.slug === tafsirSlug) : undefined;
          const numLabel = locale === "ar" ? toArabicDigits(v.numberInSurah) : v.numberInSurah;
          const marked = isBookmarked(v.numberInSurah);
          return (
            <li
              key={v.id}
              id={`ayah-${v.numberInSurah}`}
              className="group scroll-mt-32 rounded-2xl border border-transparent px-4 py-6 transition-colors hover:border-[var(--border)] hover:bg-[var(--surface)]/60 sm:px-6"
            >
              <div className="flex items-start gap-4">
                <span className="medallion mt-3 h-9 w-9 shrink-0 text-xs font-semibold">{numLabel}</span>
                <div className="min-w-0 flex-1">
                  <p className="quran-text">{v.textAr}</p>
                  {showTranslation &&
                    v.translations.map((t, i) => (
                      <p key={i} className="mt-5 leading-relaxed text-[var(--foreground)]/85">
                        {t.text}{" "}
                        <span className="text-xs text-[var(--muted-foreground)]">— {t.author}</span>
                      </p>
                    ))}
                  {tafsir && (
                    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-relaxed">
                      <p className="mb-2 flex items-center gap-2 font-semibold text-[var(--accent)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                        {locale === "ar" ? tafsir.source.nameAr : tafsir.source.nameEn}
                      </p>
                      <p dir="rtl" className="arabic whitespace-pre-line">
                        {tafsir.text}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => play(v)}
                      aria-label={
                        playing === v.numberInSurah ? dict.common.pauseAudio : dict.common.playAudio
                      }
                      title={playing === v.numberInSurah ? dict.common.pauseAudio : dict.common.playAudio}
                      className="icon-btn"
                    >
                      {playing === v.numberInSurah ? "❚❚" : "▶"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(v)}
                      aria-pressed={marked}
                      aria-label={marked ? dict.common.removeBookmark : dict.common.bookmark}
                      title={marked ? dict.common.removeBookmark : dict.common.bookmark}
                      className={`icon-btn ${marked ? "text-[var(--gold)]" : ""}`}
                    >
                      {marked ? "★" : "☆"}
                    </button>
                    <button
                      type="button"
                      onClick={() => share(v)}
                      aria-label={dict.common.share}
                      title={dict.common.copyLink}
                      className="icon-btn"
                    >
                      {copied === v.numberInSurah ? "✓" : "⧉"}
                    </button>
                    {copied === v.numberInSurah && (
                      <span className="text-xs text-[var(--accent)]">{dict.common.copied}</span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <audio ref={audioRef} onEnded={() => setPlaying(null)} className="hidden" />
    </div>
  );
}
