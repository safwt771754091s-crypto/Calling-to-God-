# Agent architecture — The True Path Islam

This document describes the AI dawah-agent platform that was added to the
existing Next.js application. It is part of the same app and database — it is
not a separate system.

## 1. Principles

- **Grounded, never fabricated.** Every religious claim must carry a citation
  from the platform's own corpus (Quran, tafsir, hadith). If no source is found,
  the content is blocked from publishing.
- **Human gate for sensitive content.** Anything quoting scripture or stating a
  religious position is routed to a human reviewer. No agent ever claims a
  scholar reviewed content — only a recorded human approval (`ContentItem.approvedById`)
  moves content to `APPROVED`.
- **No auto-publishing of unapproved content.** The publisher refuses anything
  that is not `APPROVED`/`SCHEDULED`, and a global kill switch (default OFF)
  halts all publishing.
- **Idempotent, retry-safe.** Each (content, platform, locale) publication has a
  deterministic idempotency key with a unique constraint, so retries cannot
  duplicate a post.
- **No secrets in the database.** Social accounts store only the *name* of the
  environment variable that holds their token.

## 2. Agents

| Agent | Module | Responsibility |
|-------|--------|----------------|
| Dawah Planner | `src/lib/agents/planner.ts` | Weekly/monthly plan by language, region and theme with measurable goals. |
| Research & Verification | `src/lib/agents/researcher.ts` | Grounds content in the corpus; records a citation per point; marks sensitivity. |
| Content Writer | `src/lib/agents/writer.ts` | Drafts posts, video scripts, Q&A and invitations from the grounded note. |
| Translation & Localization | `src/lib/agents/localizer.ts` | Adapts drafts per language/region; preserves Quranic Arabic; cites translators. |
| Content Review | `src/lib/agents/reviewer.ts` | Source/language/sensitivity gate; routes to human when needed. |
| Social Publisher | `src/lib/agents/publisher.ts` | Publishes approved content via official APIs with scheduling and idempotency. |
| Analytics | `src/lib/agents/analytics.ts` | Aggregates real metrics; suggests improvements without inventing numbers. |

Orchestration lives in `src/lib/agents/orchestrator.ts`. The registry (one
`Agent` row per kind) is seeded by `scripts/seed-agents.ts`.

## 3. Pipeline

```
schedule → choose locale/region → generate draft → verify sources →
review (auto) → human approve → publish (official API) → verify result →
record audit event → update analytics
```

- Generation always writes a `ContentItem` with status `SCHOLAR_REVIEW`
  (or `REJECTED` when ungrounded religious content is detected). It never
  publishes.
- Human approval is the only path to `APPROVED` (`setContentApproval`).
- Publishing is a separate, explicitly triggered step that requires the switch
  to be ON and content to be approved.

## 4. Data model (Prisma)

Added models: `Agent`, `Campaign`, `ContentItem`, `SocialAccount`,
`Publication`, `Metric`, `AuditLog` (enums `AgentKind`, `AgentStatus`, `Region`,
`ContentStatus`, `ContentType`, `SocialPlatform`, `PublicationStatus`,
`MetricKind`). See `prisma/schema.prisma`.

## 5. Authorisation (server-enforced)

Role ranking: `EDITOR < SCHOLAR < ADMIN` (`src/lib/agents/roles.ts`).

| Capability | Minimum role |
|------------|--------------|
| View dashboard / list content / preview plan / record metrics | EDITOR |
| Generate drafts | EDITOR |
| Approve or reject content | SCHOLAR |
| Toggle the kill switch, register accounts, trigger a publish | ADMIN |

Enforced in every route handler via `requireRole()`; the UI only *hides*
controls and is never the security boundary.

## 6. API surface

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/agents` | Registry, accounts, content counts, publishing state |
| POST | `/api/admin/agents/plan` | Preview a plan (no content created) |
| POST | `/api/admin/agents/generate` | Run the content pipeline for one item |
| GET/PATCH | `/api/admin/agents/content` | List content; edit/approve/reject |
| GET/POST | `/api/admin/agents/publish` | Kill switch + manual publish |
| GET/POST | `/api/admin/agents/accounts` | List/register social accounts |
| GET/POST | `/api/admin/agents/analytics` | Metrics summary + record metrics |

UI: `/admin/agents` (linked from `/admin`).

## 7. Audit trail

Every significant action writes an `AuditLog` row: `content.generated`,
`content.blocked`, `content.approved`, `content.rejected`,
`publication.published`, `publication.failed`, `publishing.enabled/disabled`.
Each row records the actor (user/agent/system), action, entity, and time.
