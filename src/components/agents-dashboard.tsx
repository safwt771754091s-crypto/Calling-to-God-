"use client";

import { useCallback, useEffect, useState } from "react";

type Status = string;

interface AgentRow {
  id: string;
  slug: string;
  kind: string;
  nameEn: string;
  nameAr: string;
  description: string;
  status: string;
}
interface AccountRow {
  id: string;
  platform: string;
  handle: string;
  displayName?: string | null;
  credentialEnv?: string | null;
  credentialPresent: boolean;
  scopes: string[];
  region: string;
  enabled: boolean;
}
interface RegionRow {
  region: string;
  nameEn: string;
  nameAr: string;
  locales: string[];
  languageGaps: string[];
  themes: string[];
  notes: string;
}
interface ContentRow {
  id: string;
  title?: string | null;
  body: string;
  locale: string;
  region: string;
  status: Status;
  createdAt: string;
}
interface PublicationRow {
  id: string;
  platform: string;
  locale: string;
  status: string;
  remoteUrl?: string | null;
  error?: string | null;
  createdAt: string;
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SOURCE_CHECKED: "bg-sky-100 text-sky-800",
  LOCALIZED: "bg-indigo-100 text-indigo-800",
  SCHOLAR_REVIEW: "bg-amber-100 text-amber-900",
  APPROVED: "bg-emerald-100 text-emerald-800",
  SCHEDULED: "bg-teal-100 text-teal-800",
  PUBLISHED: "bg-emerald-600 text-white",
  REJECTED: "bg-rose-100 text-rose-800",
  FAILED: "bg-rose-600 text-white",
};

function Chip({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone ?? "bg-[var(--surface-muted)]"}`}>
      {children}
    </span>
  );
}

export function AgentsDashboard() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [content, setContent] = useState<ContentRow[]>([]);
  const [pubs, setPubs] = useState<PublicationRow[]>([]);
  const [publishingEnabled, setPublishingEnabled] = useState(false);
  const [analytics, setAnalytics] = useState<{ byRegion: unknown[]; byLocale: unknown[]; totalMetrics: number; sources: string[] } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [role, setRole] = useState("EDITOR");

  const [topic, setTopic] = useState("");
  const [locale, setLocale] = useState("en");
  const [region, setRegion] = useState("GLOBAL");
  const [contentType, setContentType] = useState("SOCIAL_POST");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [overview, items, an] = await Promise.all([
      fetch("/api/admin/agents").then((r) => r.json()),
      fetch("/api/admin/agents/content").then((r) => r.json()),
      fetch("/api/admin/agents/analytics").then((r) => r.json()),
    ]);
    setAgents(overview.agents ?? []);
    setAccounts(overview.accounts ?? []);
    setRegions(overview.regions ?? []);
    setPublishingEnabled(Boolean(overview.publishingEnabled));
    setPubs(overview.recentPublications ?? []);
    setContent(items.items ?? []);
    setAnalytics(an.summary ?? null);
    setSuggestions(an.suggestions ?? []);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setRole(s?.user?.role ?? "EDITOR"))
      .catch(() => {});
  }, [load]);

  async function generate() {
    if (!topic.trim()) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/agents/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, locale, region, contentType }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.message ?? data.error ?? "Generation failed.");
      return;
    }
    setMsg(`Draft created (${data.status}); requires human review: ${data.requiresHuman ? "yes" : "no"}.`);
    setTopic("");
    load();
  }

  async function review(id: string, action: "approve" | "reject") {
    const res = await fetch("/api/admin/agents/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error === "forbidden" ? "Approving requires the SCHOLAR role." : "Action failed.");
      return;
    }
    load();
  }

  async function togglePublishing() {
    const res = await fetch("/api/admin/agents/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: publishingEnabled ? "disable" : "enable" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error === "forbidden" ? "The kill switch requires the ADMIN role." : "Action failed.");
      return;
    }
    setPublishingEnabled(Boolean(data.publishingEnabled));
  }

  async function publishOne(contentId: string, platform: string) {
    const res = await fetch("/api/admin/agents/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", contentId, platform }),
    });
    const data = await res.json();
    setMsg(res.ok ? `Published (${data.status}).` : `Publish blocked: ${data.reason ?? data.error}`);
    load();
  }

  const queue = content.filter((c) => c.status === "SCHOLAR_REVIEW");
  const approvable = content.filter((c) => c.status === "APPROVED" || c.status === "SCHEDULED");

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10" dir="ltr">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Dawah agents</p>
          <h1 className="text-2xl font-bold">Agent control room</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Signed in as role <strong>{role}</strong> · languages: en · ar · zh · hi · ja · ru
          </p>
        </div>
        <button
          onClick={togglePublishing}
          className={`btn ${publishingEnabled ? "btn-gold" : "btn-primary"}`}
        >
          {publishingEnabled ? "⏸ Halt all publishing" : "▶ Enable publishing"}
        </button>
      </header>

      {msg && <p className="rounded-lg bg-[var(--surface-muted)] px-4 py-2 text-sm">{msg}</p>}

      {/* Agents */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Agents</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold">{a.nameEn}</span>
                <Chip tone={a.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}>{a.status}</Chip>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]" dir="rtl">{a.nameAr}</p>
              <p className="mt-2 text-sm">{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Regions */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Regions &amp; languages</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {regions.map((r) => (
            <div key={r.region} className="card p-4 text-sm">
              <div className="mb-1 font-semibold">{r.nameEn} <span dir="rtl">({r.nameAr})</span></div>
              <div className="mb-2 flex flex-wrap gap-1">
                {r.locales.map((l) => <Chip key={l}>{l}</Chip>)}
              </div>
              {r.languageGaps.length > 0 && (
                <p className="text-xs text-amber-700">Gap: {r.languageGaps.join("; ")}</p>
              )}
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">{r.notes}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Generate */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Generate a draft</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className="field" placeholder="Topic / theme" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <select className="field" value={locale} onChange={(e) => setLocale(e.target.value)}>
            {["en", "ar", "zh", "hi", "ja", "ru"].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="field" value={region} onChange={(e) => setRegion(e.target.value)}>
            {["GLOBAL", "INDIA", "CHINA", "JAPAN"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="field" value={contentType} onChange={(e) => setContentType(e.target.value)}>
            {["SOCIAL_POST", "VIDEO_SCRIPT", "ARTICLE", "QA", "INVITATION"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={generate} disabled={busy} className="btn btn-primary mt-3">
          {busy ? "Generating…" : "Generate draft (held for review)"}
        </button>
      </section>

      {/* Review queue */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Review queue ({queue.length})</h2>
        <div className="space-y-3">
          {queue.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">Nothing awaiting review.</p>}
          {queue.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Chip tone={STATUS_TONE[c.status]}>{c.status}</Chip>
                <Chip>{c.locale}</Chip>
                <Chip>{c.region}</Chip>
                <span className="font-semibold">{c.title}</span>
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-[var(--surface-muted)] p-3 text-xs">{c.body}</pre>
              <div className="mt-2 flex gap-2">
                <button onClick={() => review(c.id, "approve")} className="btn btn-primary">Approve</button>
                <button onClick={() => review(c.id, "reject")} className="btn btn-ghost">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Approved -> publish */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Approved &amp; ready to publish ({approvable.length})</h2>
        <div className="space-y-2">
          {approvable.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span><Chip tone={STATUS_TONE[c.status]}>{c.status}</Chip> <span className="font-medium">{c.title}</span> · {c.locale}</span>
              <div className="flex gap-2">
                <button onClick={() => publishOne(c.id, "FACEBOOK")} className="btn btn-ghost">→ Facebook</button>
                <button onClick={() => publishOne(c.id, "TELEGRAM")} className="btn btn-ghost">→ Telegram</button>
              </div>
            </div>
          ))}
          {approvable.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No approved content yet.</p>}
        </div>
      </section>

      {/* Accounts */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Connected accounts</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <div key={a.id} className="card p-4 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold">{a.platform}</span>
                <Chip tone={a.enabled && a.credentialPresent ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}>
                  {a.enabled ? (a.credentialPresent ? "connected" : "no credential") : "disabled"}
                </Chip>
              </div>
              <p className="text-xs">{a.handle} · {a.region}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                env: {a.credentialEnv ?? "—"} {a.credentialPresent ? "(set)" : "(missing)"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Analytics */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Analytics (last 30 days)</h2>
        <p className="mb-2 text-xs text-[var(--muted-foreground)]">
          {analytics?.totalMetrics ?? 0} metric rows · sources: {(analytics?.sources ?? []).join(", ") || "none"}
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {suggestions.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </section>

      {/* Publications */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Publication log</h2>
        <div className="space-y-1 text-sm">
          {pubs.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2">
              <Chip tone={STATUS_TONE[p.status]}>{p.status}</Chip>
              <span>{p.platform} · {p.locale}</span>
              {p.remoteUrl && <a className="text-emerald-700 underline" href={p.remoteUrl} target="_blank" rel="noreferrer">view</a>}
              {p.error && <span className="text-rose-700">{p.error}</span>}
            </div>
          ))}
          {pubs.length === 0 && <p className="text-[var(--muted-foreground)]">No publications recorded.</p>}
        </div>
      </section>
    </div>
  );
}
