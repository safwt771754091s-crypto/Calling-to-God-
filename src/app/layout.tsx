import type { Metadata } from "next";
import {
  Fraunces,
  Manrope,
  IBM_Plex_Sans_Arabic,
  Amiri_Quran,
} from "next/font/google";
import { PwaRegistrar } from "@/components/pwa-registrar";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const quran = Amiri_Quran({
  variable: "--font-quran",
  subsets: ["arabic"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "The True Path Islam",
    template: "%s · The True Path Islam",
  },
  description:
    "A multi-lingual platform introducing Islam, the Quran, the Sunnah and the Prophet's biography.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={`${body.variable} ${display.variable} ${arabic.variable} ${quran.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegistrar />
      </body>
    </html>
  );
}
