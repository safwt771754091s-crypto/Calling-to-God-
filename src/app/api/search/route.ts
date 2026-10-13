import { NextResponse } from "next/server";
import { searchPlatform } from "@/lib/data";
import { isLocale, defaultLocale } from "@/i18n/config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const limited = rateLimit(`search:${clientIp(req)}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: limited.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const localeParam = url.searchParams.get("locale") ?? defaultLocale;
  const locale = isLocale(localeParam) ? localeParam : defaultLocale;

  const results = await searchPlatform(q, locale);
  return NextResponse.json(results);
}
