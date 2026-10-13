import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale, type Locale } from "@/i18n/config";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/") {
    const accept = request.headers.get("accept-language") ?? "";
    const detected = accept
      .split(",")
      .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase())
      .find((code): code is Locale => (locales as readonly string[]).includes(code));
    return NextResponse.redirect(new URL(`/${detected ?? defaultLocale}`, request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
