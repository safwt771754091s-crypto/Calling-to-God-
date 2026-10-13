import Link from "next/link";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { localeHref, otherLocales } from "./locale-utils";
import { StarMark } from "./header";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const nav = [
    { href: localeHref(locale, "/quran"), label: dict.nav.quran },
    { href: localeHref(locale, "/hadith"), label: dict.nav.hadith },
    { href: localeHref(locale, "/biography"), label: dict.nav.biography },
    { href: localeHref(locale, "/qa"), label: dict.nav.qa },
    { href: localeHref(locale, "/shahada"), label: dict.nav.shahada },
  ];

  const sources = [
    "Tanzil · Uthmani Quran text",
    "Sahih al-Bukhari, Sahih Muslim",
    "Tafsir Ibn Kathir, al-Tabari",
    "Al-Mukhtasar (King Fahd Complex)",
  ];

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="geo-pattern pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2.5">
            <StarMark size={40} />
            <span className="font-display text-lg font-semibold">{dict.home.heroTitle}</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]">
            {dict.footer.tagline}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {otherLocales(locale).slice(0, 5).map((l) => (
              <Link
                key={l.code}
                href={`/${l.code}`}
                className="chip hover:border-[var(--border-strong)]"
              >
                <span>{l.flag}</span>
                {l.nativeName}
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <h3 className="text-sm font-semibold">{dict.nav.home}</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {nav.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-4">
          <h3 className="text-sm font-semibold">{dict.footer.sources}</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-[var(--muted-foreground)]">
            {sources.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--gold)]" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-[var(--muted-foreground)]">
            {dict.footer.disclaimer}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} {dict.home.heroTitle}. {dict.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
