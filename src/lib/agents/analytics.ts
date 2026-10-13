import prisma from "@/lib/db";
import type { Region } from "./types";

/**
 * Analytics agent.
 *
 * Aggregates the metrics actually recorded in the database. It never invents
 * numbers: every figure is a real row count/sum, and rows whose source is
 * "manual" are labelled as such so nobody mistakes an estimate for a verified
 * platform figure.
 */

export interface AnalyticsSummary {
  byRegion: Array<{ region: Region; reach: number; engagement: number; clicks: number; siteVisits: number }>;
  byLocale: Array<{ locale: string; reach: number; engagement: number; siteVisits: number }>;
  sources: string[];
  totalMetrics: number;
}

export async function summarize(days = 30): Promise<AnalyticsSummary> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.metric.findMany({ where: { capturedAt: { gte: since } } });

  const regionMap = new Map<string, { reach: number; engagement: number; clicks: number; siteVisits: number }>();
  const localeMap = new Map<string, { reach: number; engagement: number; siteVisits: number }>();

  for (const m of rows) {
    const r = regionMap.get(m.region) ?? { reach: 0, engagement: 0, clicks: 0, siteVisits: 0 };
    if (m.kind === "REACH") r.reach += m.value;
    if (m.kind === "ENGAGEMENT") r.engagement += m.value;
    if (m.kind === "CLICKS") r.clicks += m.value;
    if (m.kind === "SITE_VISITS") r.siteVisits += m.value;
    regionMap.set(m.region, r);

    if (m.locale) {
      const l = localeMap.get(m.locale) ?? { reach: 0, engagement: 0, siteVisits: 0 };
      if (m.kind === "REACH") l.reach += m.value;
      if (m.kind === "ENGAGEMENT") l.engagement += m.value;
      if (m.kind === "SITE_VISITS") l.siteVisits += m.value;
      localeMap.set(m.locale, l);
    }
  }

  const sources = Array.from(new Set(rows.map((r) => r.source))).sort();

  return {
    byRegion: Array.from(regionMap.entries()).map(([region, v]) => ({ region: region as Region, ...v })),
    byLocale: Array.from(localeMap.entries()).map(([locale, v]) => ({ locale, ...v })),
    sources,
    totalMetrics: rows.length,
  };
}

/** Simple, evidence-based suggestions derived only from recorded metrics. */
export function suggest(summary: AnalyticsSummary): string[] {
  const tips: string[] = [];
  if (summary.totalMetrics === 0) {
    tips.push("No metrics recorded yet — connect a platform API or record figures manually.");
    return tips;
  }
  const hasEngagement = summary.byRegion.some((r) => r.engagement > 0);
  const ranked = [...summary.byRegion].sort((a, b) =>
    hasEngagement ? b.engagement - a.engagement : b.reach - a.reach,
  );
  const best = ranked[0];
  if (best) {
    tips.push(
      hasEngagement
        ? `Region ${best.region} shows the highest recorded engagement; consider expanding its cadence.`
        : `Region ${best.region} shows the highest recorded reach so far.`,
    );
  }
  const weakest = [...summary.byRegion].sort((a, b) => a.reach - b.reach)[0];
  if (weakest && weakest.reach === 0) tips.push(`Region ${weakest.region} has no recorded reach yet.`);
  if (summary.sources.includes("manual")) {
    tips.push("Some figures are manual — connect official APIs for verified numbers.");
  }
  return tips;
}
