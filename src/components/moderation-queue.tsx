"use client";

import { useState } from "react";

interface Question {
  id: string;
  locale: string;
  body: string;
  status: string;
  aiDraft: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  aiConfidence: number | null;
  answerEn: string | null;
  answerAr: string | null;
  category: { nameEn: string; nameAr: string } | null;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700",
  AI_DRAFTED: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

export function ModerationQueue({ initial }: { initial: Question[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject" | "regenerate", answer?: { answerEn?: string; answerAr?: string }) {
    setBusy(id);
    const res = await fetch("/api/admin/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...answer }),
    });
    if (res.ok) {
      const { question } = (await res.json()) as { question: Question };
      setItems((prev) => prev.map((q) => (q.id === id ? { ...q, ...question } : q)));
    }
    setBusy(null);
  }

  return (
    <ul className="space-y-5">
      {items.map((q) => (
        <li key={q.id} className="card p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-0.5 font-semibold ${STATUS_STYLE[q.status] ?? ""}`}>
              {q.status}
            </span>
            <span className="text-[var(--muted-foreground)]">{q.locale.toUpperCase()}</span>
            {q.category && (
              <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5">
                {q.category.nameEn}
              </span>
            )}
            {q.aiProvider && (
              <span className="text-[var(--muted-foreground)]">
                AI: {q.aiProvider}/{q.aiModel}
                {q.aiConfidence != null ? ` · ${(q.aiConfidence * 100).toFixed(0)}%` : ""}
              </span>
            )}
          </div>

          <p className="font-semibold">{q.body}</p>

          {q.aiDraft && (
            <details className="mt-3 rounded-lg bg-[var(--surface-muted)] p-3 text-sm">
              <summary className="cursor-pointer font-medium">AI draft (internal)</summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans">{q.aiDraft}</pre>
            </details>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <textarea
              defaultValue={q.answerEn ?? ""}
              placeholder="Answer (English)"
              rows={3}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            />
            <textarea
              defaultValue={q.answerAr ?? ""}
              placeholder="الإجابة (بالعربية)"
              rows={3}
              dir="rtl"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={busy === q.id}
              onClick={(e) => {
                const card = (e.target as HTMLElement).closest("li")!;
                const [en, ar] = Array.from(card.querySelectorAll("textarea")) as HTMLTextAreaElement[];
                act(q.id, "approve", { answerEn: en.value, answerAr: ar.value });
              }}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
            >
              Approve &amp; publish
            </button>
            <button
              disabled={busy === q.id}
              onClick={() => act(q.id, "regenerate")}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-60"
            >
              Regenerate AI
            </button>
            <button
              disabled={busy === q.id}
              onClick={() => act(q.id, "reject")}
              className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-700 disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
