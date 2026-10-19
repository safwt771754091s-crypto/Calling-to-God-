# Automation

Everything that can run without a human is wired up: CI, deploy-on-green,
scheduled backups, dependency updates, a task runner, and health/DB scripts.
The only manual step left is entering your hosting/database credentials once.

## Task runner — `make`

`make help` lists everything. The common ones:

| Command | Does |
| --- | --- |
| `make install` | `npm ci` + `prisma generate` |
| `make dev` | dev server |
| `make verify` | lint + typecheck + test (same as CI) |
| `make up` / `make down` | start / stop the compose stack |
| `make ingest` | import Quran, tafsir, hadith |
| `make seed` / `make seed-agents` | seed staff + dawah agents |
| `make i18n-audit` | fail if any locale dictionary drifted from English |
| `make content-generate` | draft dawah content (`LIMIT=5 PERIOD=weekly`) |
| `make corpus-check` | verify the Quran/hadith/tafsir corpus is complete |
| `make smoke BASE=https://…` | smoke-test a running instance |
| `make backup` / `make restore FILE=…` | dump / restore the database |
| `make reset` | recreate the local DB, then ingest + seed |

## GitHub Actions

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ci.yml` | push to `main`/`master`, PRs | install → migrate → ingest → typecheck → lint → **i18n audit** → test → build → **smoke test** |
| `deploy.yml` | after CI succeeds on `main`, or manual | builds and deploys to Vercel, then smoke-tests production |
| `backup.yml` | nightly 02:00 UTC, or manual | `pg_dump` of production → artifact kept 30 days |
| `content-generation.yml` | Mondays 06:00 UTC, or manual | runs the agent pipeline to draft content into `SCHOLAR_REVIEW` |
| `content-verify.yml` | Sundays 03:00 UTC, or manual | corpus integrity + translation drift audit |
| `security.yml` | push, PRs, Mondays 04:00 UTC | production dependency audit (gates on high+) + full report |
| `monitor.yml` | every 30 min, or manual | pings the live site and alerts a webhook on failure |

Every workflow that needs a secret **skips cleanly** when the secret is absent, so
the repo is safe to keep public before you configure hosting.

### Secrets to enable full automation

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Used by | Where to get it |
| --- | --- | --- |
| `VERCEL_TOKEN` | deploy | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | deploy | `vercel link` → `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | deploy | `vercel link` → `.vercel/project.json` |
| `PRODUCTION_URL` | deploy smoke, monitor | your deployed URL |
| `DATABASE_URL` | backup, content-generation, content-verify | production Postgres string |
| `AI_PROVIDER` | content-generation | `openai` or `gemini` (default `mock`) |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` | content-generation | your LLM key |
| `SLACK_WEBHOOK_URL` / `DISCORD_WEBHOOK_URL` / `ALERT_WEBHOOK_URL` | monitor | a webhook to receive downtime alerts |

## Operations checks

| Command | What it checks |
| --- | --- |
| `make ops-links BASE=https://…` | every internal + external link on the site (broken links fail) |
| `make ops-seo BASE=https://…` | sitemap structure, hreflang alternates + x-default, robots.txt |
| `make ops-security` | production dependency vulnerabilities (gates on high+) |
| `make ops-monitor BASE=https://…` | liveness of `/api/health` and the home page; alerts a webhook |

`deploy.yml` runs `ops-seo` automatically after a successful deploy.

## Dependabot

`.github/dependabot.yml` opens grouped weekly PRs for npm, GitHub Actions and
Docker. Each PR runs through `ci.yml` automatically.

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/bootstrap.sh` | cold-start the whole stack (docker + migrate + ingest + seed + serve) |
| `scripts/watchdog.sh` | keep the stack alive on a long-lived host |
| `scripts/smoke.sh` | end-to-end HTTP checks (used by CI and `deploy.yml`) |
| `scripts/backup-db.sh` | `pg_dump` / restore via local client or the db container |
| `scripts/i18n-audit.ts` | translation-drift audit across the six locales |
| `scripts/generate-content.ts` | plan + agent pipeline → `SCHOLAR_REVIEW` drafts |
| `scripts/corpus-check.ts` | Quran/hadith/tafsir integrity check |
| `scripts/start.sh` | serve the standalone build |
| `scripts/ingest/*` | content importers |
| `scripts/seed*.ts` | seeders |

## The one manual step

Automation needs an account it can deploy into. Do this once:

1. Create a free Postgres (Neon/Supabase) and copy its `DATABASE_URL`.
2. Import the repo on Vercel (the README has a one-click button) and set
   `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`.
3. Add the five secrets above so `deploy.yml` and `backup.yml` run.

After that every push to `main` deploys itself, every night backs up, and
dependency PRs arrive on their own.
