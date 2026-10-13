import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { listShahadaSteps } from "@/lib/data";
import { ContactForm } from "@/components/contact-form";

export const revalidate = 3600;

export default async function ShahadaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = locale as Locale;
  const dict = getDictionary(l);
  const steps = await listShahadaSteps();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 text-center">
        <span className="eyebrow">{dict.nav.shahada}</span>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{dict.shahada.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">
          {dict.shahada.subtitle}
        </p>
      </header>

      <div className="hero-emerald relative mb-14 overflow-hidden rounded-[1.6rem] px-6 py-12 text-center">
        <div className="geo-pattern pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden />
        <div className="relative">
          <h2 className="text-xs uppercase tracking-[0.25em] text-[var(--gold-soft)]">
            {dict.shahada.theShahada}
          </h2>
          <p className="quran-text mt-8 text-[1.6rem] !text-white sm:text-[2rem]">
            {dict.shahada.shahadaText}
          </p>
          <div className="mx-auto my-6 max-w-xs gold-rule" />
          <p className="mx-auto max-w-xl leading-relaxed text-white/85">
            {dict.shahada.shahadaMeaning}
          </p>
        </div>
      </div>

      <ol className="space-y-5">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={`card-elevated animate-fade-up p-6 ${
              s.isRite ? "border-[var(--gold)]/70 ring-1 ring-[var(--gold)]/40" : ""
            }`}
            style={{ "--i": i % 10 } as React.CSSProperties}
          >
            <div className="flex items-start gap-4">
              <span className="medallion h-10 w-10 shrink-0 text-sm font-bold">{s.order}</span>
              <div>
                <h2 className="text-lg font-semibold">{l === "ar" ? s.titleAr : s.titleEn}</h2>
                <p className="mt-2 leading-relaxed text-[var(--muted-foreground)]">
                  {l === "ar" ? s.bodyAr : s.bodyEn}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-14">
        <div className="mb-6 flex items-center gap-4">
          <h2 className="text-2xl font-semibold">{dict.shahada.pillarsTitle}</h2>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {dict.shahada.pillars.map((p, i) => (
            <li key={i} className="card flex items-center gap-3.5 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-muted)] font-display font-bold text-[var(--primary)]">
                {i + 1}
              </span>
              <span className="leading-snug">{p}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <ContactForm dict={dict} locale={l} />
      </section>
    </div>
  );
}
