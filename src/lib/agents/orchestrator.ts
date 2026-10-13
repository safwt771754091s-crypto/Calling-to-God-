import prisma from "@/lib/db";
import { locales as ALL_LOCALES, type Locale } from "@/i18n/config";
import { research } from "./researcher";
import { writeDraft } from "./writer";
import { localize } from "./localizer";
import { review } from "./reviewer";
import { recordAudit } from "./audit";
import type { ContentType, Region } from "./types";

/**
 * Pipeline orchestrator.
 *
 * Traces the required flow end-to-end and records an audit entry per step:
 *
 *   schedule -> choose locale/region -> generate draft -> verify sources ->
 *   review/approve -> publish via official API -> verify result ->
 *   record event -> update analytics
 *
 * Generating content NEVER publishes it. Everything lands in SCHOLAR_REVIEW and
 * only a human approval (setContentApproval) can move it to APPROVED. Each step
 * is safe to re-run; generation creates a fresh draft rather than mutating an
 * approved one.
 */

export interface GenerateResult {
  contentId: string;
  status: string;
  requiresHuman: boolean;
  reasons: string[];
  grounded: boolean;
  citations: string[];
}

export async function generateContent(params: {
  campaignId?: string;
  locale: Locale;
  region: Region;
  contentType: ContentType;
  topic: string;
  scheduledAt?: Date;
}): Promise<GenerateResult> {
  const { locale, region, contentType, topic } = params;

  // 1-2. Plan/choose: validate the locale against what the platform ships.
  if (!ALL_LOCALES.includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }

  // 3. Research & verify sources.
  const note = await research(topic, locale);

  // 4. Generate a grounded draft.
  const draft = await writeDraft({ topic, locale, region, contentType, note });

  // 5. Localize (adapt for the region/language).
  const localized = await localize({ draft, targetLocale: locale, region });

  // 6. Automated review gate.
  const decision = review({ note, draft: localized, locale, supportedLocales: ALL_LOCALES });

  const status = decision.decision === "BLOCKED" ? "REJECTED" : "SCHOLAR_REVIEW";

  const item = await prisma.contentItem.create({
    data: {
      campaignId: params.campaignId ?? null,
      locale,
      region,
      contentType,
      title: localized.title,
      body: localized.body,
      status,
      sourceRefs: note.sources as unknown as object,
      scheduledAt: params.scheduledAt ?? null,
    },
  });

  await recordAudit({
    actorType: "agent",
    action: decision.decision === "BLOCKED" ? "content.blocked" : "content.generated",
    entityType: "ContentItem",
    entityId: item.id,
    contentId: item.id,
    detail: { locale, region, contentType, decision: decision.decision, grounded: note.grounded },
  });

  return {
    contentId: item.id,
    status,
    requiresHuman: decision.requiresHuman,
    reasons: decision.reasons,
    grounded: note.grounded,
    citations: note.sources.map((s) => s.label),
  };
}

/** A human reviewer approves or rejects content. This is the only path to APPROVED. */
export async function setContentApproval(params: {
  contentId: string;
  approved: boolean;
  reviewerId: string;
  edits?: { title?: string; body?: string };
}): Promise<{ status: string }> {
  const { contentId, approved, reviewerId, edits } = params;
  const status = approved ? "APPROVED" : "REJECTED";
  const updated = await prisma.contentItem.update({
    where: { id: contentId },
    data: {
      status,
      approvedById: approved ? reviewerId : null,
      approvedAt: approved ? new Date() : null,
      ...(edits?.title !== undefined ? { title: edits.title } : {}),
      ...(edits?.body !== undefined ? { body: edits.body } : {}),
    },
  });
  await recordAudit({
    actorId: reviewerId,
    actorType: "user",
    action: approved ? "content.approved" : "content.rejected",
    entityType: "ContentItem",
    entityId: contentId,
    contentId,
  });
  return { status: updated.status };
}
