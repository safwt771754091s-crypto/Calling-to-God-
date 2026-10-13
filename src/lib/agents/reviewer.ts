import type { ResearchNote } from "./types";
import type { Draft } from "./writer";

/**
 * Content Review agent.
 *
 * Runs the automated parts of the pipeline gate:
 *   1. source check   — is every religious claim grounded?
 *   2. language check — is the locale a supported platform locale?
 *   3. sensitivity    — does it quote scripture / state rulings? if so it MUST
 *                       go to a human reviewer.
 *
 * It never claims a scholar reviewed anything. Only a real human approval
 * (recorded in ContentItem.approvedById) moves content past SCHOLAR_REVIEW.
 */

export type ReviewDecision = "APPROVED_FOR_HUMAN" | "BLOCKED" | "NEEDS_HUMAN";

export interface ReviewResult {
  decision: ReviewDecision;
  requiresHuman: boolean;
  reasons: string[];
}

const SENSITIVE_MARKERS = [
  "quran", "qur'an", "verse", "surah", "hadith", "sunnah", "prophet", "allah",
  "halal", "haram", "fatwa", "ruling", "sharia", "shari'ah", "القرآن", "حديث",
  "النبي", "الله", "حلال", "حرام", "فتوى",
];

export function review(params: {
  note: ResearchNote;
  draft: Draft;
  locale: string;
  supportedLocales: readonly string[];
}): ReviewResult {
  const reasons: string[] = [];
  let blocked = false;

  if (!params.supportedLocales.includes(params.locale)) {
    blocked = true;
    reasons.push(`Locale "${params.locale}" is not a supported platform locale.`);
  }

  if (params.note.sensitive && !params.note.grounded) {
    blocked = true;
    reasons.push("Religious content has no verifiable source citation.");
  }

  const haystack = `${params.draft.title}\n${params.draft.body}`.toLowerCase();
  const flagged = SENSITIVE_MARKERS.filter((m) => haystack.includes(m.toLowerCase()));
  const requiresHuman = params.note.sensitive || flagged.length > 0;
  if (requiresHuman) {
    reasons.push(
      flagged.length
        ? `Religiously sensitive terms detected (${flagged.slice(0, 4).join(", ")}).`
        : "Content is grounded in scripture — requires human review.",
    );
  }

  if (blocked) return { decision: "BLOCKED", requiresHuman: true, reasons };
  return {
    decision: requiresHuman ? "NEEDS_HUMAN" : "APPROVED_FOR_HUMAN",
    requiresHuman,
    reasons,
  };
}
