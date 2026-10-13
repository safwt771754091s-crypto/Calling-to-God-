"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/types";

export function ContactForm({ dict, locale }: { dict: Dictionary; locale: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/qa/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, language: locale, message }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="card-elevated border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <p className="font-semibold">{dict.qa.submitted}</p>
        <p className="mt-1 text-sm">{dict.shahada.contactDesc}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card-elevated space-y-4 p-6 sm:p-8">
      <h3 className="text-lg font-semibold">{dict.shahada.contactDawah}</h3>
      <p className="text-sm text-[var(--muted-foreground)]">{dict.shahada.contactDesc}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          required
          minLength={2}
          placeholder={dict.common.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field"
        />
        <input
          required
          type="email"
          placeholder={dict.common.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
      </div>
      <textarea
        required
        minLength={2}
        rows={4}
        placeholder={dict.common.message}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="field"
      />
      <button type="submit" disabled={status === "sending"} className="btn btn-primary disabled:opacity-60">
        {status === "sending" ? dict.common.loading : dict.common.send}
      </button>
      {status === "error" && <p className="text-sm text-rose-700">⚠</p>}
    </form>
  );
}
