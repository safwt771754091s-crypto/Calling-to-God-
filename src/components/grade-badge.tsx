import { localeMeta, type Locale } from "@/i18n/config";

const STYLES: Record<string, { wrap: string; dot: string }> = {
  SAHIH: { wrap: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  HASAN: { wrap: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  DAIF: { wrap: "bg-rose-50 text-rose-800 border-rose-200", dot: "bg-rose-500" },
  UNKNOWN: { wrap: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

const LABELS: Record<string, Record<Locale, string>> = {
  SAHIH: { en: "Sahih", ar: "صحيح", zh: "可靠", hi: "सहीह", ja: "真正", ru: "Сахих" },
  HASAN: { en: "Hasan", ar: "حسن", zh: "良好", hi: "हसन", ja: "良好", ru: "Хасан" },
  DAIF: { en: "Da'if", ar: "ضعيف", zh: "薄弱", hi: "ज़ईफ़", ja: "弱い", ru: "Даиф" },
  UNKNOWN: { en: "Unknown", ar: "غير محدد", zh: "未知", hi: "अज्ञात", ja: "不明", ru: "Неизвестно" },
};

export function GradeBadge({ grade, locale }: { grade: string; locale: Locale }) {
  const style = STYLES[grade] ?? STYLES.UNKNOWN;
  const dir = localeMeta[locale].dir;
  return (
    <span
      dir={dir}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.wrap}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {LABELS[grade]?.[locale] ?? grade}
    </span>
  );
}
