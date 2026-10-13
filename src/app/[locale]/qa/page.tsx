import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { listPublishedQuestions, listQaCategories } from "@/lib/data";
import { QaForm } from "@/components/qa-form";

export const revalidate = 0;

export default async function QaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = locale as Locale;
  const dict = getDictionary(l);
  const [categories, answers] = await Promise.all([
    listQaCategories(),
    listPublishedQuestions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-10 text-center">
        <span className="eyebrow">{dict.nav.qa}</span>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{dict.qa.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">{dict.qa.subtitle}</p>
      </header>

      <QaForm dict={dict} locale={l} categories={categories} />

      <section className="mt-14">
        <div className="mb-6 flex items-center gap-4">
          <h2 className="text-2xl font-semibold">{dict.qa.publishedAnswers}</h2>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        {answers.length === 0 ? (
          <p className="card p-10 text-center text-[var(--muted-foreground)]">
            {dict.qa.noAnswers}
          </p>
        ) : (
          <ul className="space-y-4">
            {answers.map((a, i) => {
              const answer = l === "ar" ? a.answerAr ?? a.answerEn : a.answerEn ?? a.answerAr;
              return (
                <li
                  key={a.id}
                  className="card-elevated animate-fade-up p-6"
                  style={{ "--i": i % 10 } as React.CSSProperties}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                    {a.category && (
                      <span className="chip chip-active">
                        {l === "ar" ? a.category.nameAr : a.category.nameEn}
                      </span>
                    )}
                    <span className="text-[var(--muted-foreground)]">{a.locale.toUpperCase()}</span>
                  </div>
                  <p className="font-display text-lg font-semibold leading-snug">{a.body}</p>
                  {answer ? (
                    <>
                      <div className="my-4 gold-rule" />
                      <p className="leading-relaxed text-[var(--muted-foreground)]">{answer}</p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm italic text-[var(--muted-foreground)]">
                      {dict.qa.answerPending}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
