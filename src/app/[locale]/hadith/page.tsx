import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { listHadithCollections, listHadithTopics, searchHadith } from "@/lib/data";
import { localeHref } from "@/components/locale-utils";
import { GradeBadge } from "@/components/grade-badge";

export const revalidate = 0;

export default async function HadithPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const l = locale as Locale;
  const dict = getDictionary(l);
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q : undefined;
  const collection = typeof sp.collection === "string" ? sp.collection : undefined;
  const topic = typeof sp.topic === "string" ? sp.topic : undefined;
  const gradeParam = typeof sp.grade === "string" ? sp.grade : undefined;
  const grade =
    gradeParam && ["SAHIH", "HASAN", "DAIF", "UNKNOWN"].includes(gradeParam)
      ? (gradeParam as "SAHIH" | "HASAN" | "DAIF" | "UNKNOWN")
      : undefined;
  const page = Number(sp.page ?? 1) || 1;

  const [collections, topics, results] = await Promise.all([
    listHadithCollections(),
    listHadithTopics(),
    searchHadith({ q, collection, topic, grade, page, pageSize: 20 }),
  ]);

  const totalPages = Math.max(1, Math.ceil(results.total / results.pageSize));
  const base = localeHref(l, "/hadith");
  const buildHref = (over: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    const merged = { q, collection, topic, grade: gradeParam, page: undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) usp.set(k, String(v));
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-8">
        <span className="eyebrow">{dict.nav.hadith}</span>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{dict.hadith.title}</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted-foreground)]">{dict.hadith.subtitle}</p>
      </header>

      <form
        method="get"
        className="card-elevated mb-8 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-12"
      >
        <div className="relative lg:col-span-6">
          <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-[var(--muted-foreground)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder={dict.common.searchPlaceholder}
            className="field ps-10"
          />
        </div>
        <select name="collection" defaultValue={collection ?? ""} className="field lg:col-span-3">
          <option value="">{dict.hadith.allCollections}</option>
          {collections.map((c) => (
            <option key={c.slug} value={c.slug}>
              {l === "ar" ? c.nameAr : c.nameEn} ({c._count.hadiths})
            </option>
          ))}
        </select>
        <select name="grade" defaultValue={gradeParam ?? ""} className="field lg:col-span-3">
          <option value="">
            {dict.hadith.grade} — {dict.common.all}
          </option>
          <option value="SAHIH">{dict.hadith.grades.SAHIH}</option>
          <option value="HASAN">{dict.hadith.grades.HASAN}</option>
          <option value="DAIF">{dict.hadith.grades.DAIF}</option>
          <option value="UNKNOWN">{dict.hadith.grades.UNKNOWN}</option>
        </select>
        {topic && <input type="hidden" name="topic" value={topic} />}
        <button type="submit" className="btn btn-primary lg:col-span-12">
          {dict.common.search}
        </button>
      </form>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="me-1 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
          {dict.hadith.browseByTopic}
        </span>
        <Link
          href={buildHref({ topic: undefined, page: undefined })}
          className={`chip ${!topic ? "chip-active" : ""}`}
        >
          {dict.common.all}
        </Link>
        {topics.map((t) => (
          <Link
            key={t.slug}
            href={buildHref({ topic: t.slug, page: undefined })}
            className={`chip ${topic === t.slug ? "chip-active" : ""}`}
          >
            {l === "ar" ? t.nameAr : t.nameEn}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
        <p className="text-sm text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">
            {results.total.toLocaleString(l)}
          </span>{" "}
          {dict.nav.hadith}
        </p>
        {(q || collection || topic || gradeParam) && (
          <Link href={base} className="text-xs font-medium text-[var(--primary)] hover:underline">
            {dict.common.clear}
          </Link>
        )}
      </div>

      {results.items.length === 0 ? (
        <p className="card p-10 text-center text-[var(--muted-foreground)]">
          {dict.common.noResults}
        </p>
      ) : (
        <ul className="space-y-4">
          {results.items.map((h, i) => (
            <li
              key={h.id}
              className="card-elevated animate-fade-up p-5 sm:p-6"
              style={{ "--i": i % 10 } as React.CSSProperties}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                <Link
                  href={localeHref(l, `/hadith/${h.collection.slug}/${h.number}`)}
                  className="font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
                >
                  {l === "ar" ? h.collection.nameAr : h.collection.nameEn}
                </Link>
                <span className="text-[var(--muted-foreground)]">
                  #{h.number}
                </span>
                <GradeBadge grade={h.grade} locale={l} />
                {h.topics.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 font-medium text-[var(--muted-foreground)]"
                  >
                    {l === "ar" ? t.nameAr : t.nameEn}
                  </span>
                ))}
              </div>
              <p dir="rtl" className="arabic text-lg leading-loose">
                {h.arabic}
              </p>
              {h.english && (
                <>
                  <div className="my-4 gold-rule" />
                  <p className="leading-relaxed text-[var(--muted-foreground)]">{h.english}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-1.5">
          {page > 1 && (
            <Link href={buildHref({ page: String(page - 1) })} className="chip">
              ←
            </Link>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref({ page: String(p) })}
              className={`chip ${p === page ? "chip-active" : ""}`}
            >
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link href={buildHref({ page: String(page + 1) })} className="chip">
              →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
