import { generateText, aiEnabled } from "@/lib/ai";
import type { Locale } from "@/i18n/config";
import type { ContentType, ResearchNote, Region } from "./types";
import { REGION_STRATEGIES } from "./regions";

/**
 * Content Writer agent.
 *
 * Drafts platform-appropriate content (posts, scripts, Q&A, invitations). It is
 * fed the researcher's grounded note and must not introduce claims that are not
 * backed by a citation. When no LLM key is configured it emits an explicit
 * placeholder scaffold rather than pretending to have written content.
 */

export interface DraftRequest {
  topic: string;
  locale: Locale;
  region: Region;
  contentType: ContentType;
  note: ResearchNote;
}

export interface Draft {
  title: string;
  body: string;
  usedAi: boolean;
  provider: string;
  model: string;
}

const SYSTEM = `You are a respectful content writer for a da'wah platform that introduces Islam.
Rules:
- Write in the requested language for a general public audience.
- Ground every factual claim ONLY in the provided citations; never invent verses, hadith or references.
- Do not issue legal rulings (fatwa); invite the reader to consult a qualified scholar.
- Be warm, clear and non-confrontational.
- Keep Quranic Arabic text exactly as given and name the translator when quoting a translation.`;

function buildPrompt(req: DraftRequest): string {
  const strategy = REGION_STRATEGIES[req.region];
  const cites = req.note.sources.map((s) => `- ${s.label}: ${s.quote ?? ""}`).join("\n");
  return [
    `Region: ${strategy.nameEn}`,
    `Language: ${req.locale}`,
    `Content type: ${req.contentType}`,
    `Theme: ${req.topic}`,
    cites ? `Citations to use:\n${cites}` : `No citations available — do NOT state religious facts.`,
  ].join("\n");
}

function placeholder(req: DraftRequest): Draft {
  const cites = req.note.sources.map((s) => `• ${s.label}`).join("\n") || "• (none found)";
  return {
    title: `[Draft] ${req.topic}`,
    body: [
      `Draft placeholder for ${req.region} / ${req.locale} (${req.contentType}).`,
      `No AI key is configured, so no text was generated.`,
      ``,
      `Grounded citations available for the writer:`,
      cites,
      ``,
      `A reviewer should write the final text and confirm the sources.`,
    ].join("\n"),
    usedAi: false,
    provider: "mock",
    model: "heuristic",
  };
}

export async function writeDraft(req: DraftRequest): Promise<Draft> {
  if (!aiEnabled()) return placeholder(req);

  try {
    const { text, provider, model } = await generateText(SYSTEM, buildPrompt(req), 0.5);
    const trimmed = text.trim();
    if (!trimmed) return placeholder(req);
    const title = trimmed.split("\n")[0].slice(0, 120);
    return { title, body: trimmed, usedAi: true, provider, model };
  } catch (err) {
    console.error("[writer] generation failed:", (err as Error).message);
    return placeholder(req);
  }
}
