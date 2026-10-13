import { generateText, aiEnabled } from "@/lib/ai";
import type { Locale } from "@/i18n/config";
import type { Region } from "./types";
import { REGION_STRATEGIES } from "./regions";
import type { Draft } from "./writer";

/**
 * Translation & Localization agent.
 *
 * Adapts a draft into a target language, taking cultural and idiomatic
 * differences into account. It is instructed to preserve Quranic Arabic text
 * verbatim and to attribute the translator. Machine output is always marked as
 * a draft for human language review — it is never presented as an approved
 * translation of scripture.
 */

export interface LocalizeRequest {
  draft: Draft;
  targetLocale: Locale;
  region: Region;
}

export interface LocalizedDraft extends Draft {
  targetLocale: Locale;
  machineTranslated: boolean;
}

const SYSTEM = `You localize da'wah content for a specific culture and language.
Rules:
- Produce a natural, culturally appropriate adaptation, not a literal translation.
- Preserve any Quranic Arabic text exactly; never translate or alter it.
- When quoting a Quran translation, keep the translator's name.
- Never present the output as an approved/authoritative translation of scripture.
- Keep the message respectful and free of sectarian polemic.`;

export async function localize(req: LocalizeRequest): Promise<LocalizedDraft> {
  const strategy = REGION_STRATEGIES[req.region];
  const note = `[Machine localization draft — requires human language review]\n\n`;

  if (!aiEnabled()) {
    return {
      ...req.draft,
      title: `${req.draft.title} [${req.targetLocale}]`,
      body: [
        note,
        `Target language: ${req.targetLocale} · Region: ${strategy.nameEn}`,
        `Cultural notes: ${strategy.notes}`,
        ``,
        req.draft.body,
      ].join("\n"),
      targetLocale: req.targetLocale,
      machineTranslated: false,
      provider: "mock",
      model: "heuristic",
    };
  }

  try {
    const { text, provider, model } = await generateText(
      SYSTEM,
      [
        `Target language: ${req.targetLocale}`,
        `Region: ${strategy.nameEn}`,
        `Cultural notes: ${strategy.notes}`,
        ``,
        req.draft.body,
      ].join("\n"),
      0.4,
    );
    const body = text.trim() || req.draft.body;
    return {
      ...req.draft,
      title: req.draft.title,
      body: `${note}${body}`,
      targetLocale: req.targetLocale,
      machineTranslated: true,
      provider,
      model,
    };
  } catch (err) {
    console.error("[localizer] failed:", (err as Error).message);
    return {
      ...req.draft,
      title: `${req.draft.title} [${req.targetLocale}]`,
      body: `${note}${req.draft.body}`,
      targetLocale: req.targetLocale,
      machineTranslated: false,
      provider: "mock",
      model: "heuristic",
    };
  }
}
