# Deployment

The app is a standard Next.js server app with a PostgreSQL database. Any host that
runs Node.js and can reach Postgres works; the steps below cover Vercel (recommended)
and a plain Docker/Node host.

## 1. Provision a permanent PostgreSQL database

The platform needs a **serverless-friendly** Postgres that stays reachable from the
host (not the throwaway container used for local dev). Free options that work with
Vercel:

- **Neon** — `https://neon.tech`, copy the pooled connection string.
- **Supabase** — Project → Settings → Database → Connection string (use the pooler).
- **Vercel Postgres** — Storage tab → Create Database.

The connection string looks like:

```
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

## 2. Create the Vercel project

1. Vercel → **Add New… → Project → Import Git Repository** → pick `Calling-to-God-`.
2. Framework preset: **Next.js** (auto-detected). Leave build/install commands to
   `vercel.json`, which runs `prisma generate && prisma migrate deploy && next build`.
3. Add the environment variables below (Production + Preview), then **Deploy**.

| Variable | Required | Value |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string from step 1 |
| `AUTH_SECRET` | yes | `openssl rand -base64 32` |
| `AUTH_URL` | yes | the deployed URL, e.g. `https://<project>.vercel.app` |
| `AI_PROVIDER` | no | `mock` (default, offline) / `openai` / `gemini` |
| `OPENAI_API_KEY` | if `openai` | OpenAI key |
| `GEMINI_API_KEY` | if `gemini` | Google AI Studio key |
| `PLATFORM_DOMAIN` | no | public domain used for staff email addresses |

`AUTH_SECRET` and `AUTH_URL` are read by NextAuth v5; `trustHost` is enabled so the
first deploy works before `AUTH_URL` is set, but set it anyway for stable callbacks.

## 3. Load content (one time)

Migrations run automatically on deploy, but the Quran/hadith/tafsir import and the
seed do not (they are heavy and idempotent). Run them once against the production
database from your machine:

```bash
export DATABASE_URL="postgresql://…"   # the production string
npx prisma migrate deploy
npm run ingest:quran
npm run ingest:tafsir
npm run ingest:hadith
npm run seed          # staff user, biography, shahada steps, config
npm run seed:agents   # dawah agent roster + review gates
```

After that the deploy is fully functional. Re-running the ingest scripts is safe
(they skip existing rows).

## Alternative: Docker / any Node host

```bash
docker compose up -d db          # or point DATABASE_URL at managed Postgres
npx prisma migrate deploy
npm run ingest:quran && npm run ingest:tafsir && npm run ingest:hadith
npm run seed && npm run seed:agents
npm run build
PORT=3000 npm start              # serves the standalone server
```

`scripts/bootstrap.sh` automates exactly these steps for a cold host and
`scripts/watchdog.sh` keeps the services alive on a long-lived machine.
