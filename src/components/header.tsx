"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/i18n/types";
import { localeMeta, type Locale } from "@/i18n/config";
import { localeHref, otherLocales, swapLocale } from "./locale-utils";

export function StarMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-[0.7rem] text-[var(--gold-soft)]"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(150deg, var(--primary) 0%, var(--primary-700) 100%)",
        boxShadow: "inset 0 0 0 1px rgba(201,162,39,0.5)",
      }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none">
        <path
          d="M12 2.5 14.6 8.4 21 9.2l-4.7 4.4 1.3 6.2L12 16.8 6.4 19.8l1.3-6.2L3 9.2l6.4-.8z"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { href: localeHref(locale, "/"), label: dict.nav.home },
    { href: localeHref(locale, "/quran"), label: dict.nav.quran },
    { href: localeHref(locale, "/hadith"), label: dict.nav.hadith },
    { href: localeHref(locale, "/biography"), label: dict.nav.biography },
    { href: localeHref(locale, "/qa"), label: dict.nav.qa },
    { href: localeHref(locale, "/shahada"), label: dict.nav.shahada },
  ];

  const isActive = (href: string) =>
    href === localeHref(locale, "/") ? pathname === href : pathname.startsWith(href);
  const searchHref = localeHref(locale, "/search");
  const searchActive = pathname.startsWith(searchHref);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-[var(--border)] bg-[var(--surface)]/85 shadow-[0_8px_30px_-18px_rgba(7,53,40,0.35)] backdrop-blur-xl"
          : "border-transparent bg-[var(--background)]/70 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <Link href={localeHref(locale, "/")} className="group flex items-center gap-2.5">
          <StarMark />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[1.05rem] font-semibold tracking-tight">
              {dict.home.heroTitle}
            </span>
            <span className="mt-0.5 text-[0.66rem] font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
              {dict.footer.taglineShort}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--gold)] transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={searchHref}
            aria-label={dict.nav.search}
            className={`hidden h-10 w-10 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--border-strong)] sm:grid ${
              searchActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium transition hover:border-[var(--border-strong)]"
              aria-label={dict.common.language}
              aria-expanded={langOpen}
            >
              <span className="text-base leading-none">{localeMeta[locale].flag}</span>
              <span className="hidden sm:inline">{localeMeta[locale].nativeName}</span>
              <span aria-hidden className="text-[0.6rem] opacity-60">
                ▼
              </span>
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                <ul className="absolute end-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lg)] animate-fade-in">
                  <li className="px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                    {dict.common.language}
                  </li>
                  {otherLocales(locale).map((l) => (
                    <li key={l.code}>
                      <Link
                        href={swapLocale(pathname, l.code)}
                        onClick={() => setLangOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-[var(--surface-muted)]"
                      >
                        <span className="text-base leading-none">{l.flag}</span>
                        <span>{l.nativeName}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={dict.common.menu}
            aria-expanded={open}
          >
            <span className="relative block h-3.5 w-5">
              <span
                className={`absolute inset-x-0 top-0 h-0.5 rounded bg-[var(--foreground)] transition-transform ${
                  open ? "translate-y-[6px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute inset-x-0 top-1.5 h-0.5 rounded bg-[var(--foreground)] transition-opacity ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute inset-x-0 top-3 h-0.5 rounded bg-[var(--foreground)] transition-transform ${
                  open ? "-translate-y-[6px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[var(--border)] bg-[var(--surface)] py-2 lg:hidden animate-fade-in">
          {[...nav, { href: searchHref, label: dict.nav.search }].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 text-sm ${
                isActive(item.href)
                  ? "bg-[var(--surface-muted)] font-semibold text-[var(--primary)]"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
