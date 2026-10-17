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
| `make smoke BASE=https://…` | smoke-test a running instance |
| `make backup` / `make restore FILE=…` | dump / restore the database |
| `make reset` | recreate the local DB, then ingest + seed |

## GitHub Actions

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ci.yml` | push to `main`/`master`, PRs | install → migrate → ingest → typecheck → lint → test → build → **smoke test** |
| `deploy.yml` | after CI succeeds on `main`, or manual | builds and deploys to Vercel, then smoke-tests production |
| `backup.yml` | nightly 02:00 UTC, or manual | `pg_dump` of production → artifact kept 30 days |

`deploy.yml` and `backup.yml` **skip cleanly** when their secrets are absent, so the
repo is safe to keep public before you configure hosting.

### Secrets to enable full automation

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Used by | Where to get it |
| --- | --- | --- |
| `VERCEL_TOKEN` | deploy | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | deploy | `vercel link` → `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | deploy | `vercel link` → `.vercel/project.json` |
| `PRODUCTION_URL` | deploy smoke | your deployed URL |
| `DATABASE_URL` | backup | production Postgres string |

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
