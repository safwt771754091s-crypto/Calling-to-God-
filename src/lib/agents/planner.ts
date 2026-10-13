import type { Locale } from "@/i18n/config";
import { locales as ALL_LOCALES } from "@/i18n/config";
import type { ContentType, DawahPlan, PlanItem, Region } from "./types";
import { REGION_STRATEGIES, localesForRegion } from "./regions";

/**
 * Dawah Planning agent.
 *
 * Produces a deterministic weekly/monthly plan split by language, region and
 * theme, with measurable goals. The plan is a schedule of *draft* work; it does
 * not publish anything and every generated item still passes review.
 */

const CONTENT_MIX: ContentType[] = [
  "SOCIAL_POST",
  "QA",
  "VIDEO_SCRIPT",
  "ARTICLE",
  "INVITATION",
];

const DEFAULT_GOALS: Record<string, number> = {
  reach: 500,
  engagement: 50,
  siteVisits: 25,
};

export interface PlanOptions {
  period?: "weekly" | "monthly";
  regions?: Region[];
  startDate?: Date;
  goals?: Record<string, number>;
}

export function buildPlan(options: PlanOptions = {}): DawahPlan {
  const period = options.period ?? "weekly";
  const regions = options.regions ?? (Object.keys(REGION_STRATEGIES) as Region[]);
  const start = options.startDate ?? new Date();
  const goals = { ...DEFAULT_GOALS, ...(options.goals ?? {}) };
  const days = period === "monthly" ? 30 : 7;

  const items: PlanItem[] = [];
  for (const region of regions) {
    const strategy = REGION_STRATEGIES[region];
    const locales = localesForRegion(region, ALL_LOCALES);
    locales.forEach((locale, localeIndex) => {
      strategy.themes.forEach((theme, themeIndex) => {
        const offset = (localeIndex * 2 + themeIndex) % days;
        const scheduledAt = new Date(start);
        scheduledAt.setDate(scheduledAt.getDate() + offset);
        items.push({
          locale,
          region,
          contentType: CONTENT_MIX[(localeIndex + themeIndex) % CONTENT_MIX.length],
          theme,
          topic: `${theme} — ${strategy.nameEn}`,
          scheduledAt: scheduledAt.toISOString(),
          goals: {
            metric: "reach",
            target: goals.reach,
          },
        });
      });
    });
  }

  return { period, generatedAt: new Date().toISOString(), items };
}

/** One plan item per region/locale/day — a compact preview for the dashboard. */
export function summarizePlan(plan: DawahPlan): {
  byRegion: Record<string, number>;
  byLocale: Record<string, number>;
} {
  const byRegion: Record<string, number> = {};
  const byLocale: Record<string, number> = {};
  for (const item of plan.items) {
    byRegion[item.region] = (byRegion[item.region] ?? 0) + 1;
    byLocale[item.locale] = (byLocale[item.locale] ?? 0) + 1;
  }
  return { byRegion, byLocale };
}

export type { Locale };
