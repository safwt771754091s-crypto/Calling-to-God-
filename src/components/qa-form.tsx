"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/types";

export function QaForm({
  dict,
  locale,
  categories,
}: {
  dict: Dictionary;
  locale: string;
  categories: { id: number; nameEn: string; nameAr: string }[];
}) {
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/qa/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          locale,
          categoryId: categoryId ? Number(categoryId) : undefined,
          visitorName: name || undefined,
          visitorEmail: email || undefined,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
      setBody("");
      setName("");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="card-elevated border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <p className="text-lg font-semibold">{dict.qa.submitted}</p>
        <p className="mt-1 text-sm">{dict.qa.submittedDesc}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card-elevated space-y-4 p-6 sm:p-8">
      <h3 className="text-lg font-semibold">{dict.qa.askQuestion}</h3>
      <div>
        <label className="mb-1.5 block text-sm font-medium">{dict.qa.yourQuestion}</label>
        <textarea
          required
          minLength={5}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="field"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">{dict.qa.category}</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="field"
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === "ar" ? c.nameAr : c.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {dict.common.name} ({dict.common.optional})
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          {dict.common.email} ({dict.common.optional})
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
      </div>
      <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs leading-relaxed text-[var(--muted-foreground)]">
        {dict.qa.aiNote}
      </p>
      <button type="submit" disabled={status === "sending"} className="btn btn-primary disabled:opacity-60">
        {status === "sending" ? dict.common.loading : dict.qa.submitQuestion}
      </button>
      {status === "error" && <p className="text-sm text-rose-700">⚠</p>}
    </form>
  );
}
