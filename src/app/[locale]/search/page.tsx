import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { GlobalSearch } from "@/components/global-search";
import { languageAlternates } from "@/lib/site";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = locale as Locale;
  const dict = getDictionary(l);
  return {
    title: dict.search.title,
    description: dict.search.subtitle,
    alternates: { canonical: `/${l}/search`, languages: languageAlternates("search") },
  };
}

export default async function SearchPage({
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
  const q = typeof sp.q === "string" ? sp.q : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8">
        <span className="eyebrow">{dict.nav.search}</span>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{dict.search.title}</h1>
        <p className="mt-3 text-[var(--muted-foreground)]">{dict.search.subtitle}</p>
      </header>
      <GlobalSearch locale={l} dict={dict} initialQuery={q} />
    </div>
  );
}
