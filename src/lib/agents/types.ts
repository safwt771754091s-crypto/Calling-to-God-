import type { Locale } from "@/i18n/config";

/**
 * The specialised dawah agents. Each has a fixed role in the content pipeline:
 *
 *   planner -> researcher -> writer -> localizer -> reviewer -> (human) -> publisher -> analytics
 *
 * `kind` mirrors the Prisma AgentKind enum; the registry seeds one Agent row
 * per kind so the dashboard can show live status.
 */
export type AgentKind =
  | "PLANNER"
  | "RESEARCHER"
  | "WRITER"
  | "LOCALIZER"
  | "REVIEWER"
  | "PUBLISHER"
  | "ANALYTICS";

export type Region = "INDIA" | "CHINA" | "JAPAN" | "GLOBAL";

export type ContentType = "SOCIAL_POST" | "VIDEO_SCRIPT" | "ARTICLE" | "QA" | "INVITATION";

export interface AgentDefinition {
  kind: AgentKind;
  slug: string;
  nameEn: string;
  nameAr: string;
  description: string;
}

export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    kind: "PLANNER",
    slug: "planner",
    nameEn: "Dawah Planner",
    nameAr: "وكيل التخطيط الدعوي",
    description:
      "Builds weekly/monthly publishing plans split by language, region and theme, with measurable goals.",
  },
  {
    kind: "RESEARCHER",
    slug: "researcher",
    nameEn: "Research & Verification",
    nameAr: "وكيل البحث والتحقق",
    description:
      "Grounds every claim in the platform corpus (Quran, hadith, tafsir) and records a citation for each point.",
  },
  {
    kind: "WRITER",
    slug: "writer",
    nameEn: "Content Writer",
    nameAr: "وكيل إنشاء المحتوى",
    description:
      "Drafts posts, video scripts, Q&A and invitations tailored to each platform and region.",
  },
  {
    kind: "LOCALIZER",
    slug: "localizer",
    nameEn: "Translation & Localization",
    nameAr: "وكيل الترجمة والتوطين",
    description:
      "Adapts content into the platform's five target languages, preserving Quranic text and citing translators.",
  },
  {
    kind: "REVIEWER",
    slug: "reviewer",
    nameEn: "Content Review",
    nameAr: "وكيل مراجعة المحتوى",
    description:
      "Checks sources, language and sensitivity, and routes religiously sensitive content to a human reviewer.",
  },
  {
    kind: "PUBLISHER",
    slug: "publisher",
    nameEn: "Social Publisher",
    nameAr: "وكيل النشر الاجتماعي",
    description:
      "Publishes approved content via official APIs with scheduling, idempotency and safe retries.",
  },
  {
    kind: "ANALYTICS",
    slug: "analytics",
    nameEn: "Analytics",
    nameAr: "وكيل التحليلات",
    description:
      "Collects reach, engagement, clicks and site visits per campaign/locale/region and suggests improvements.",
  },
];

export function agentByKind(kind: AgentKind): AgentDefinition {
  const found = AGENT_REGISTRY.find((a) => a.kind === kind);
  if (!found) throw new Error(`Unknown agent kind: ${kind}`);
  return found;
}

/** A single grounded, cited point produced by the researcher. */
export interface SourceRef {
  label: string;
  kind: "quran" | "hadith" | "tafsir" | "general";
  ref: string; // e.g. "2:255", "Bukhari #1", "Tafsir Ibn Kathir 2:255"
  quote?: string;
}

export interface ResearchNote {
  topic: string;
  summary: string;
  sources: SourceRef[];
  /** True when the note contains Quranic/hadith text or a religious ruling. */
  sensitive: boolean;
  /** False when no verifiable source could be attached — content must not publish. */
  grounded: boolean;
}

export interface PlanItem {
  locale: Locale;
  region: Region;
  contentType: ContentType;
  theme: string;
  topic: string;
  scheduledAt: string; // ISO date
  goals: { metric: string; target: number };
}

export interface DawahPlan {
  period: "weekly" | "monthly";
  generatedAt: string;
  items: PlanItem[];
}
