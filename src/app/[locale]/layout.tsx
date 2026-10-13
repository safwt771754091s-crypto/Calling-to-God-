import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale, localeMeta, locales, type Locale } from "@/i18n/config";
import { SITE_NAME, SITE_URL, languageAlternates } from "@/lib/site";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: { canonical: `/${locale}`, languages: languageAlternates() },
    openGraph: {
      siteName: SITE_NAME,
      title: dict.meta.title,
      description: dict.meta.description,
      locale,
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const dir = localeMeta[locale].dir;

  return (
    <div dir={dir} lang={locale} className="flex min-h-full flex-col">
      <a href="#main" className="skip-link">
        {dict.a11y.skipToContent}
      </a>
      <Header locale={locale} dict={dict} />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer locale={locale} dict={dict} />
    </div>
  );
}
