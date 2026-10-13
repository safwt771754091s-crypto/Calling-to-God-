import prisma from "@/lib/db";
import type { Locale } from "@/i18n/config";
import type { ResearchNote, SourceRef } from "./types";

/**
 * Research & Verification agent.
 *
 * It grounds content in the platform's own corpus and records a citation for
 * every point. It never invents verses, hadith or references: when nothing can
 * be found it returns `grounded: false`, and downstream steps must not publish.
 */

const STOPWORDS = new Set([
  "the", "and", "for", "with", "about", "what", "who", "how", "why", "islam",
  "islamic", "muslim", "muslims", "into", "from", "this", "that", "your", "you",
]);

function terms(topic: string): string[] {
  return topic
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    .slice(0, 6);
}

export async function research(topic: string, locale: Locale): Promise<ResearchNote> {
  const words = terms(topic);
  const sources: SourceRef[] = [];

  if (words.length > 0) {
    const [verses, hadiths] = await Promise.all([
      prisma.verse.findMany({
        where: {
          OR: [
            { textAr: { contains: words[0] } },
            { translations: { some: { text: { contains: words[0], mode: "insensitive" } } } },
          ],
        },
        take: 3,
        include: {
          surah: { select: { number: true, nameEn: true } },
          translations: { where: { languageCode: locale }, select: { text: true, author: true } },
        },
      }),
      prisma.hadith.findMany({
        where: {
          grade: { in: ["SAHIH", "HASAN"] },
          OR: words.flatMap((w) => [
            { english: { contains: w, mode: "insensitive" as const } },
            { arabic: { contains: w } },
          ]),
        },
        take: 3,
        include: { collection: { select: { nameEn: true } } },
      }),
    ]);

    for (const v of verses) {
      const translation = v.translations[0];
      sources.push({
        label: `${v.surah.nameEn} ${v.surah.number}:${v.numberInSurah}`,
        kind: "quran",
        ref: `${v.surah.number}:${v.numberInSurah}`,
        quote: translation ? `${translation.text} — ${translation.author}` : v.textAr.slice(0, 200),
      });
    }
    for (const h of hadiths) {
      sources.push({
        label: `${h.collection.nameEn} #${h.number}`,
        kind: "hadith",
        ref: `${h.collection.nameEn} #${h.number}`,
        quote: (h.english ?? h.arabic).slice(0, 240),
      });
    }
  }

  const summary = sources.length
    ? `Grounded on ${sources.length} corpus excerpt(s) for "${topic}".`
    : `No verifiable corpus excerpt found for "${topic}".`;

  return {
    topic,
    summary,
    sources,
    sensitive: sources.some((s) => s.kind === "quran" || s.kind === "hadith" || s.kind === "tafsir"),
    grounded: sources.length > 0,
  };
}

/** Human-readable citation strings, e.g. "Al-Baqarah 2:255". */
export function citationLabels(note: ResearchNote): string[] {
  return note.sources.map((s) => s.label);
}
