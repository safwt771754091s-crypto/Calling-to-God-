import type { Locale } from "@/i18n/config";
import type { Region } from "./types";

/**
 * Region campaign strategy. Locales are restricted to those actually shipped
 * by the platform (src/i18n/config.ts: en, ar, zh, hi, ja, ru); nothing here
 * adds or removes a language. Themes are introductory and respectful, aimed at
 * a general public audience — never targeted at individuals by belief.
 */
export interface RegionStrategy {
  region: Region;
  nameEn: string;
  nameAr: string;
  /** Platform locales appropriate for this audience, in priority order. */
  locales: Locale[];
  /** Locales that would help but are not yet shipped (recorded, not added). */
  languageGaps: string[];
  themes: string[];
  notes: string;
}

export const REGION_STRATEGIES: Record<Region, RegionStrategy> = {
  INDIA: {
    region: "INDIA",
    nameEn: "India",
    nameAr: "الهند",
    locales: ["en", "hi"],
    languageGaps: ["Urdu (romanised) — large audience, not currently shipped"],
    themes: [
      "What is Islam? core beliefs in simple terms",
      "Common questions answered respectfully",
      "Prophetic ethics: honesty, family, neighbourliness",
      "Ramadan and daily worship explained",
    ],
    notes:
      "India is linguistically and culturally diverse: Hindi and English are prioritised, and content must avoid treating the audience as homogeneous.",
  },
  CHINA: {
    region: "CHINA",
    nameEn: "China",
    nameAr: "الصين",
    locales: ["zh"],
    languageGaps: ["Uyghur — sensitive; not addressed by automated localization"],
    themes: [
      "Introduction to Islam for a general audience",
      "Quranic wisdom and moral teachings",
      "The Prophet's biography: an overview",
    ],
    notes:
      "Reach depends on platform availability; some international services are restricted in China. Content is prepared for allowed channels only — no bypassing of platform or legal restrictions.",
  },
  JAPAN: {
    region: "JAPAN",
    nameEn: "Japan",
    nameAr: "اليابان",
    locales: ["ja"],
    languageGaps: [],
    themes: [
      "Islam explained without assumed prior knowledge",
      "Islamic ethics and daily life",
      "Reading the Quran: structure and themes",
    ],
    notes:
      "Assume little prior religious background; explain concepts plainly and always link to citable sources the reader can consult.",
  },
  GLOBAL: {
    region: "GLOBAL",
    nameEn: "Global",
    nameAr: "عالمي",
    locales: ["en", "ar", "ru"],
    languageGaps: [],
    themes: [
      "Islam at a glance",
      "The Quran and the Sunnah",
      "Frequently asked questions",
    ],
    notes: "General English/Arabic/Russian outreach to Western and European audiences.",
  },
};

export function strategyFor(region: Region): RegionStrategy {
  return REGION_STRATEGIES[region];
}

/** Locale subset for a region, intersected with what the platform ships. */
export function localesForRegion(region: Region, available: readonly Locale[]): Locale[] {
  return strategyFor(region).locales.filter((l) => available.includes(l));
}
