import OpenAI from "openai";
import prisma from "./db";

export type AiProvider = "openai" | "gemini" | "mock";

export interface AnswerDraft {
  draft: string;
  confidence: number;
  provider: AiProvider;
  model: string;
  citations: string[];
}

const SYSTEM_PROMPT = `You are a careful assistant helping a da'wah platform answer visitors' questions about Islam.
Rules:
- Be accurate, respectful and concise.
- Base your answer ONLY on the provided reference excerpts and general well-established knowledge.
- Never fabricate Quranic verses or hadith; if you are unsure, say so and recommend scholarly follow-up.
- Do not issue legal rulings (fatwa); encourage consulting a qualified scholar for personal rulings.`;

export function activeProvider(): AiProvider {
  const p = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  if (p === "openai" || p === "gemini") return p;
  return "mock";
}

export function activeModel(): string {
  return process.env.AI_MODEL ?? (activeProvider() === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini");
}

export interface ChatResult {
  text: string;
  provider: AiProvider;
  model: string;
}

/** True when a real LLM key is configured (otherwise agents run offline). */
export function aiEnabled(): boolean {
  const provider = activeProvider();
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  return false;
}

/**
 * Generic single-turn completion used by the content agents. Returns the raw
 * model text; callers remain responsible for grounding and citation checks.
 */
export async function generateText(
  system: string,
  user: string,
  temperature = 0.4,
): Promise<ChatResult> {
  const provider = activeProvider();
  const model = activeModel();

  if (provider === "openai") {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
    });
    return { text: res.choices[0]?.message?.content ?? "", provider, model };
  }

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature },
      }),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { text, provider, model };
  }

  return { text: "", provider: "mock", model: "heuristic" };
}

/** Retrieve a few relevant corpus excerpts to ground the answer. */
async function retrieveContext(question: string, limit = 4): Promise<string[]> {
  const terms = question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);
  if (terms.length === 0) return [];

  const excerpts: string[] = [];

  const hadiths = await prisma.hadith.findMany({
    where: {
      grade: { in: ["SAHIH", "HASAN"] },
      OR: terms.map((t) => ({ english: { contains: t, mode: "insensitive" as const } })),
    },
    take: limit,
    include: { collection: { select: { nameEn: true } } },
  });
  for (const h of hadiths) {
    if (h.english) excerpts.push(`Hadith (${h.collection.nameEn} #${h.number}): ${h.english}`);
  }

  const tafsirs = await prisma.tafsir.findMany({
    where: { OR: terms.map((t) => ({ text: { contains: t } })) },
    take: 2,
    include: {
      source: { select: { nameEn: true } },
      verse: { select: { numberInSurah: true, surah: { select: { number: true } } } },
    },
  });
  for (const t of tafsirs) {
    excerpts.push(
      `Tafsir (${t.source.nameEn}, ${t.verse.surah.number}:${t.verse.numberInSurah}): ${t.text.slice(0, 500)}`,
    );
  }

  return excerpts.slice(0, limit);
}

export async function generateAnswerDraft(
  question: string,
  locale: string,
): Promise<AnswerDraft> {
  const provider = activeProvider();
  const model = activeModel();
  const context = await retrieveContext(question);

  if (provider === "mock" || (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY)) {
    // Offline-safe draft: a structured scaffold a scholar completes. Never fabricates.
    const refs = context.length ? context : [];
    const draft = [
      `[AI draft — pending scholarly review]`,
      ``,
      `Question (${locale}): ${question}`,
      ``,
      `Suggested response outline:`,
      `1. Acknowledge the question respectfully.`,
      `2. Present the established Islamic position on the topic.`,
      refs.length
        ? `3. Support with the following sources:\n${refs.map((r) => `   - ${r}`).join("\n")}`
        : `3. (No matching corpus excerpts found — the reviewer should add primary sources.)`,
      `4. Close with an invitation to ask follow-up questions.`,
      ``,
      `Note: This is a placeholder produced without an AI key. Review and rewrite before publishing.`,
    ].join("\n");
    return {
      draft,
      confidence: refs.length ? 0.35 : 0.15,
      provider: "mock",
      model: "heuristic",
      citations: refs,
    };
  }

  const userPrompt = [
    `Visitor locale: ${locale}`,
    `Question: ${question}`,
    context.length ? `Reference excerpts:\n${context.join("\n\n")}` : `No reference excerpts available.`,
  ].join("\n\n");

  if (provider === "openai") {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    });
    const draft = res.choices[0]?.message?.content ?? "";
    return { draft, confidence: context.length ? 0.6 : 0.3, provider, model, citations: context };
  }

  // Gemini REST
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const draft = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return { draft, confidence: context.length ? 0.6 : 0.3, provider, model, citations: context };
}
