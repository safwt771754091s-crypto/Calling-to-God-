# The True Path Islam (TruePath)

A multi-lingual dawah platform that introduces Islam and publishes the sciences of
the Quran and the Sunnah to Western and European audiences, in six languages:
English, Arabic, Chinese, Hindi, Japanese and Russian.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsafwt771754091s-crypto%2FCalling-to-God-)

> One-click deploy to Vercel. You will be asked for `DATABASE_URL` (a permanent
> Postgres such as Neon/Supabase), `AUTH_SECRET` and `AUTH_URL`. See
> [`docs/deployment.md`](docs/deployment.md) for the full walkthrough.

## Modules

| Module | Route | Description |
| --- | --- | --- |
| Quran & Tafsir | `/[locale]/quran` | Uthmani text, translations per locale, integrated tafsir (Ibn Kathir, al-Tabari, al-Mukhtasar) |
| Hadith | `/[locale]/hadith` | 10 collections, topical browsing, grade badges, full-text search |
| Biography | `/[locale]/biography` | Prophetic biography timeline (Meccan / Medinan) |
| Interactive Q&A | `/[locale]/qa` | Visitor questions -> AI draft -> scholar review -> published answer |
| New-Muslim track | `/[locale]/shahada` | Step-by-step guide to the Shahada + direct contact with dawah staff |

Staff moderation lives at `/admin` (credentials sign-in), backed by
`/api/admin/questions`.

## Stack

- **Framework** Next.js 16 (App Router, RSC) - cross-platform web, SEO-friendly
- **Data** PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)
- **Auth** NextAuth v5 (credentials + JWT)
- **AI** pluggable provider (`mock` / `openai` / `gemini`) with retrieval grounding
  and moderation, used only to draft answers for human review
- **i18n** dictionary-based localization under `src/i18n/`, RTL-aware UI

## Local development

```bash
npm install
npx prisma generate
npm run db:migrate          # apply migrations
npm run ingest:quran        # 114 surahs, 6236 verses, 5 translations
npm run ingest:tafsir       # Ibn Kathir, al-Tabari, al-Mukhtasar
npm run ingest:hadith       # 10 collections + topic links
npm run seed                # staff user, biography, shahada steps, config
npm run dev
```

Seed staff user: `admin@trupath.local` / `admin12345` (change in production).

Environment variables (see `.env`): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`,
`AI_PROVIDER`, `AI_MODEL`, `OPENAI_API_KEY`, `GEMINI_API_KEY`.

## Deployment (Docker + Postgres)

```bash
docker compose up --build -d
```

Compose starts Postgres, applies migrations, then runs the app (Next standalone)
on port 3000. Content ingestion (`npm run ingest:*`) and `npm run seed` are run
once against the database after the stack is up.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness + DB counts + AI provider |
| `GET /api/quran/surahs` | Surah index |
| `GET /api/quran/surahs/{n}?locale=` | Verses, translations, tafsir |
| `GET /api/quran/tafsir-sources` | Tafsir sources |
| `GET /api/hadith/collections` | Collections with counts |
| `GET /api/hadith/search?q=&collection=&topic=&grade=&page=` | Hadith search |
| `GET /api/biography`, `GET /api/shahada` | Content |
| `POST /api/qa/questions` | Submit a question |
| `POST /api/qa/contact` | Request dawah contact |
| `GET /api/qa/answers` | Published answers |
| `GET/PATCH /api/admin/questions` | Review queue (staff only) |

## Content provenance

Arabic canonical text comes from Tanzil/Uthmani datasets; translations are the
recognized public-domain/attributed renderings (Yusuf Ali, Kuliev, Ma Jian,
Azizul Haque, Ryoichi Mita). Tafsir and hadith come from open datasets
(`spa5k/tafsir_api`, `fawazahmed0/hadith-api` and `quran.com`). The platform
publishes no unattributed answers: every Q&A response is drafted by AI and then
approved by a human scholar.

## Deployment

See [`docs/deployment.md`](docs/deployment.md) for a permanent deploy (Vercel + managed
Postgres). The repo ships `vercel.json`, a `postinstall` Prisma generate hook, and a
`db:deploy` script so migrations run on every release.

## Automation

CI, deploy-on-green, nightly backups, scheduled content generation, weekly
corpus/translation verification, Dependabot and a `make` task runner are all wired
up — see [`docs/automation.md`](docs/automation.md). `make help` lists every task;
`make verify` runs what CI runs; `make smoke BASE=https://…` checks a live instance;
`make content-generate` drafts content into the scholar review queue.
