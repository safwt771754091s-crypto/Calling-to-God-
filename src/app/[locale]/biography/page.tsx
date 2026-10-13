import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { listBiography } from "@/lib/data";

export const revalidate = 3600;

export default async function BiographyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = locale as Locale;
  const dict = getDictionary(l);
  const events = await listBiography();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-12 text-center">
        <span className="eyebrow">{dict.nav.biography}</span>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{dict.biography.title}</h1>
        <p className="mt-3 text-[var(--muted-foreground)]">{dict.biography.subtitle}</p>
      </header>

      <ol className="relative space-y-6 border-s border-[var(--border-strong)] ps-8">
        {events.map((e, i) => (
          <li
            key={e.id}
            className="animate-fade-up relative"
            style={{ "--i": i % 10 } as React.CSSProperties}
          >
            <span className="absolute -start-[2.55rem] top-5 grid h-5 w-5 place-items-center rounded-full border-2 border-[var(--gold)] bg-[var(--surface)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            </span>
            <div className="card-elevated p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-[var(--primary)] px-3 py-1 font-display text-sm font-semibold text-[var(--primary-foreground)]">
                  {e.year}
                </span>
                <span className="chip">
                  {e.era === "mecca" ? dict.biography.eraMecca : dict.biography.eraMedina}
                </span>
              </div>
              <h2 className="text-lg font-semibold">{l === "ar" ? e.titleAr : e.titleEn}</h2>
              <p className="mt-2.5 leading-relaxed text-[var(--muted-foreground)]">
                {l === "ar" ? e.descriptionAr : e.descriptionEn}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
