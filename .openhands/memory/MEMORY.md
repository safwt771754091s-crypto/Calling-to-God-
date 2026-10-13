## إعادة التصميم التحريري + سجل الزوار (2026-10-12)
- الفرع `feat/editorial-redesign-visitor-log` (commit a5c3fd1) — **مدفوع**، PR #12 مفتوح (main).
  نشرات Vercel: `taiz-now` + `taiz-now-s5jv` + `taiz-now-ibjx` **نجحت**؛ فقط `taiz-now--public`
  فشل (المشروع الوحيد المربوط بقاعدة بيانات). لكن **قاعدة البيانات غير مربوطة بأي مشروع ناجح**:
  `GET /api/health` على taiz-now وs5jv = {"database":"down"}، والصفحة 500. يعني الكود منشور
  لكن يلزم ربط Postgres بمشروع `taiz-now` (Storage→Connect Project) — لا VERCEL_TOKEN لدينا.
- التصميم: نظام ألوان «ورق دافئ» فاتح (#f5f3ee) + ترويسة قرمزية، خطوط Amiri + Noto_Sans_Arabic
  عبر next/font. التوكنز القديمة (--muted/--border/--panel/--brand) محفوظة كي لا تتعطل الأدوات.
- ملفات جديدة: src/components/editorial.tsx (LeadStory/NewsCard/HeadlineRow/Ticker/RuleHeading)،
  src/components/Logo.tsx (درع SVG + علامة صح، يستعمل var(--brand))، src/app/icon.svg (favicon).
  ContentList صار يستدعي NewsCard؛ SectionView صار له ترويسة تحريرية + kicker.
- **ميزة المالك «من زار المنصة»**: جدول `Visit` (migration 20261012230000_visit_analytics)،
  src/lib/analytics/visits.ts (recordVisit + visitSummary)، نقطة عامة POST /api/track،
  ومكوّن عميل VisitTracker (sendBeacon على تنقّل، يتخطّى /login /dashboard /security /admin ...).
  صفحة /visitors (تتطلب security:manage = المالك). تسجّل path/referer/ip/ua/geo headers
  (x-vercel-ip-country/city)، تصنّف الروبوتات (isBot) وتعدّ الزوار المتفردين بـ visitorId
  المُجزّأ (sha256 بادئة 32). ملاحظة: curl يُصنّف bot (سلوك صحيح).
- تحقق: prisma generate+migrate ✅، tsc ✅، next build ✅، vitest 67/67 ✅، eslint ✅.
- تشغيل محلي: `PORT=12000 npx next start -p 12000` (output: standalone → تحذير
  "next start does not work with output: standalone" لكنه يخدم فعلاً). تأكد من قتل
  next-server القديم عند EADDRINUSE. الرابط العام work-1...: HTTP 200 والتصميم الجديد ظاهر.



## تشخيص فشل نشر Vercel (2026-10-12)
- **السبب الجذري الحقيقي (مهم):** Vercel يبني من الفرع الافتراضي للمستودع
  `feat/smart-verification-platform` (متخلّف عند 4aa9bc2، Prisma 6)، وليس من `main`.
  لهذا رجع خطأ Prisma 6 `P1012 Environment variable not found: DATABASE_URL` رغم إصلاح
  main. لا يمكن تغيير default_branch عبر GITHUB_TOKEN (403 "not accessible by integration").
  الحل المتّبع: مزامنة الفرع الافتراضي مع main (`git merge origin/main` ثم push مباشرة
  إليه) — دمج نظيف بلا تعارض (اختبار worktree). كرّره بعد كل دفع لـ main حتى يغيّر المستخدم
  الفرع الافتراضي يدوياً (GitHub→Settings→Branches).
- إصلاحان: PR#8 (db-url.ts يقبل كل مزوّدات Postgres + generate بلا DB) وPR#9
  (migrate.mjs يتخطّى بتحذير عند غياب DB بدل إسقاط البناء). بعد PR#9 الدفع 415241da
  على main → **نشرات الإنتاج نجحت** (taiz-now + taiz-now-s5jv) والموقع يعرض العنوان الصحيح.
- يتبقّى: ربط قاعدة بيانات (Storage→Create Postgres→Connect Project) وإلا الصفحات 500.
- مشاريع Vercel المرتبطة: `taiz-now`, `taiz-now-s5jv`, `taiz-now-ibjx`(قديم)، و`taiz` (موقع آخر).

## Supabase + النشر (2026-10-12، آخر تحديث)
- **قاعدة الاتصال الصحيحة من Supabase = Session pooler (IPv4، منفذ 5432).**
  المضيف المباشر `db.<ref>.supabase.co` **IPv6 فقط** وVercel (IPv4) لا يصله → المهلة/الفشل.
  المستخدم: project_ref = `ccttqggeiqmelipxeqiz`، المشروع `TaizNow`، المنطقة ap-northeast-1.
- إدماج Supabase↔Vercel يضبط تلقائياً: POSTGRES_URL, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING
  (المجمّع), و POSTGRES_URL_NON_POOLING (المباشر). كودنا يقرأ هذه الأسماء أصلاً.
- **PR#11** (migrate.mjs): يجرّب كل روابط الاتصال بالترتيب (المباشر ثم pooler)، وإن فشلت كلها
  → تحذير ويُكمل البناء (لا يُسقط النشر). `MIGRATE_STRICT=1` يعيد الإسقاط. trimmed timeout 60s.
- حالة النشر: المشاريع `taiz-now`, `taiz-now-s5jv`, `taiz-now-ibjx` **تنجح**؛ فقط
  `taiz-now--public` يفشل (الوحيد المربوط بقاعدة بيانات). البناء الكامل محلياً **ينجح** حتى مع
  قاعدة غير قابلة للوصول ⇒ ليست مشكلة كود. يحتاج سجل بناء Vercel (لا يوجد VERCEL_TOKEN عندنا).

## (تفاصيل أقدم)
- كل نشرات Vercel فاشلة (production + preview)، ولا يوجد نشر ناجح إطلاقاً في السجل.
  المستودع مربوط بمشروعين: `taiz-now-ibjx` و`taiz` (الأخير يخدم موقعاً آخر).
- السبب ليس الكود: نُسخ main نظيفاً وشُغّل تسلسل Vercel الحرفي
  (`prisma generate && node scripts/migrate.mjs && next build`) محلياً → نجح كاملاً.
- السبب الحقيقي: `DATABASE_URL` غير مضبوط في Vercel. مع Prisma 7، `prisma.config.ts`
  يُحمّل لكل أمر ويستدعي `env("DATABASE_URL")` → ترمي PrismaConfigEnvError حتى في
  `prisma generate` قبل الوصول لقاعدة البيانات. بدون المتغيّر يفشل البناء في أول خطوة.
  (حتى مع Prisma 6 كانت النشرات تفشل — أُصلحت سابقاً بـ PR#4/#5، أي المشكلة إعداد Vercel).
- الحقول المطلوبة على Vercel (Settings→Environment Variables، Production+Preview):
  DATABASE_URL (Neon pooled)، DIRECT_URL (Neon direct، اختياري لكن يُفضّل)،
  AUTH_SECRET (عشوائي طويل)، AUTH_TRUST_HOST=true، NEXTAUTH_URL، PLATFORM_URL،
  CRON_SECRET، وOLLAMA_ENABLED=false (لا تضع OLLAMA_BASE_URL على Vercel).
- ملاحظة: المستودع default_branch = `feat/smart-verification-platform` (قديم، Prisma 6)؛
  لكن Vercel production نشر فعلاً sha من main. رمز GITHUB_TOKEN لا يغيّر default_branch (403).
- لا يوجد VERCEL_TOKEN في البيئة ⇒ لا يمكن جلب Build Logs عبر CLI/API؛ التشخيص من محاكاة محلية.
- حشو تشخيصي: `git clone -b main` (النسخ الافتراضي يجلب default_branch القديم!).
- الإصلاح (PR#8, merged 2651559): `src/lib/db-url.ts` يحل الرابط من أي مزوّد
  (pooled: DATABASE_URL/POSTGRES_PRISMA_URL/POSTGRES_URL/NEON_DATABASE_URL؛
  direct: DIRECT_URL/DATABASE_URL_UNPOOLED/POSTGRES_URL_NON_POOLING). prisma.config.ts
  لم يعد يستدعي env() صراحةً ⇒ `prisma generate` ينجح بدون DB. migrate.mjs يعطي رسالة
  واضحة عند غياب الرابط. أي: Vercel Postgres يعمل بلا إعادة تسمية يدوية.


## صيانة الاعتماديات (2026-10-12) — branch chore/update-deps, PR #6
- Prisma 6 → 7 (7.10.0): v7 لا يقرأ `url` من المخطط ولا يحمّل .env تلقائياً.
  الحل الدائم: `prisma.config.ts` في الجذر (يستورد `dotenv/config`، يضبط
  schema/migrations/seed و datasource.url=DIRECT_URL||DATABASE_URL) + إزالة
  `url` من `datasource` في schema.prisma + تمرير محوّل تشغيل إلى PrismaClient:
  `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`.
  التوحيد في `src/lib/prisma.ts`؛ أي مكان ينشئ عميلاً خاصاً (seed.ts, scripts/*) يجب أن يستورد
  `prisma` من هناك. رغم أن tsc يمرّ بدون المحوّل، وقت التشغيل يرمي
  PrismaClientInitializationError. الحزم: @prisma/adapter-pg + pg (runtime) + @types/pg (dev).
- Prisma 7 لا يزال يدعم المولّد `prisma-client-js` (لا داعي لـ `prisma-client` الجديد).
- القيود المُبرَّرة (لا تُرقَّى): typescript يبقى 5.9.x (typescript-eslint@8 يقصر النظير على
  <6.1؛ TS7 يكسر `eslint` ويرمي `prefer-const`). prisma 7.10.0 (8.0.0-rc مرفوض).
  nodemailer 8.x (نظير next-auth). @types/node يتبع زمن التشغيل (Node 24 → ^24، ليس 26).
  next-auth 5.0.0-beta يبقى. `output:standalone` تحذيرياً لا يعمل مع `next start`؛ محلياً
  شغّل بـ `npm run start` (المنفذ 12000).
- الصفحات المحمية تعيد 307 لـ/login عند عدم الدخول — سلوك صحيح. للتحقق من تدفق مصادق:
  GET /api/auth/csrf ثم POST /api/auth/callback/credentials مع csrfToken.
- البيئة: PostgreSQL غير مثبّت افتراضياً → `sudo apt-get install postgresql` ثم
  `sudo pg_ctlcluster 17 main start`، وأنشئ دور/قاعدة taiznow. الاختبارات (vitest، 63) وهمية
  لا تستخدم Prisma مباشرة (أنواع فقط) لذا لا تحتاج قاعدة بيانات.

# Project Memory

# ШЄШ№ШІ Ш§Щ„ШўЩ† (Taiz Now) вЂ” Smart Verification Platform вЂ” 2026-10-10
Built from scratch on the (previously empty) repo `safwt771754091s-crypto/Taiz-now-`.
PR #1, branch feat/smart-verification-platform. Workspace: /workspace/project.
> NOTE: The Teacher-Safwat- / shcool notes further down are from PRIOR uses of this
> same sandbox and do NOT describe this codebase.

## What it is
Arabic-first RTL fact-checking platform: verified news, rumor observatory, corrections
center, public anonymous reports, media analysis (metadata / AI-gen / deepfake / geo),
claim analysis, interactive Leaflet maps, 7-role RBAC, owner-only user admin.

## Stack / env (durable)
- Next.js 15.5.27 (App Router) + TS + Tailwind v4 via @tailwindcss/postcss.
- PostgreSQL 17 (`sudo pg_ctlcluster 17 main start`). DB `taiznow`, role
  `taiznow`/`taiznow_secret` @ 127.0.0.1:5432. Prisma 6.19.3, migration `20261010190650_init`.
  Seed = `prisma/seed.ts` (tsx).
- NextAuth 5 beta (Credentials + JWT); role stored in the session.
- App runs on PORT 12000 (exposed host work-1-...all-hands.dev). OPENAI_API_KEY empty
  в‡’ ai.ts runs deterministic OFFLINE heuristics (never blocks).

## Confidence engine (src/lib/confidence.ts) вЂ” matches spec
Weights sum to 100: source 25, content 20, image 15, video 15, context 15, human 10.
`computeTotal` clamps EACH signal to 0..100, sums weight*score, THEN /100 (do NOT clamp
after dividing вЂ” old bug gave totals of 1). Bands inclusive: verified 90-100, true 75-89,
likely 60-74, suspicious 40-59, false 0-39. Advisory only; human owns final verdict.

## Gotchas learned
- create-next-app installed Next 16; pinned down to 15.5.27. Its layout.tsx used Next16
  APIs (LayoutProps, next/font Geist) вЂ” rewrote for Next 15.
- http.ts imports @/lib/auth (NextAuth) в‡’ CANNOT be imported by Vitest node tests
  ("Cannot find module next/server"). Keep pure helpers (slugify) in src/lib/slug.ts.
- Vitest chokes on Tailwind's PostCSS plugin вЂ” set `css.postcss.plugins=[]` in vitest.config.ts.
- `ss -ltn` does NOT list the port here (empty even when bound). Use curl /api/health +
  `ps aux | grep next-server`. Watchdog uses health endpoint + 8s grace to avoid EADDRINUSE.
- GitHub token CANNOT change repo default_branch (403). Empty repo в‡’ first pushed branch
  becomes default. Fix: create orphan `main` baseline, push, rebase feature onto it, open PR.
- SANDBOX RESET wiped PostgreSQL packages mid-session (files survived); recover by re-running
  `scripts/bootstrap_env.sh`.

## Ops (automation, works automatically)
- `scripts/bootstrap_env.sh` full from-scratch setup (apt postgresql, npm install, .env,
  prisma generate+migrate deploy+seed, then start.sh). Idempotent.
- `scripts/start.sh` build-if-needed, ensure PG, `next start -p 12000`, start watchdog.
- `scripts/watchdog.sh` self-heals PG + app, re-runs bootstrap if system deps vanish.

## Verify
`npm run typecheck` В· `npm test` (39 tests) В· `npm run build` (24 routes).
Login: GET /api/auth/csrf в†’ POST /api/auth/callback/credentials. Demo users password
`password` (owner/editor/factcheck/media/geo/social/viewer @taiznow.ye).

## AI agents + social (added 2026-10-10, PR #1)
- Agent workforce replaces per-role human accounts. 6 agents in catalog.ts run in
  pipeline order: collector(الجامع)→monitor(الراصد)→verifier(المدقّق)→
  writer(الصائغ)→publisher(الناشر)→responder(المفنّد). Autopilot loop
  scripts/autopilot_loop.sh (AUTOPILOT_INTERVAL, default 180s) auto-started by
  start.sh (pid .run/autopilot.pid, log .run/autopilot.log). CLI scripts/autopilot.ts.
  Idempotency via ContentItem.tags: 'agent-written','agent-responded'.
- Collector = keyless public RSS/Atom (Google News Yemen edition hl=ar&gl=YE;
  SOURCE_FEEDS override; default queries تعز/اليمن/عدن/صنعاء). Dedupe by
  Report.sourceUrl (sourceUrl+origin columns added). readArticle via keyless r.jina.ai.
  Live: Google RSS ~101 items/query; one tick collected 37 then deduped 50.
- Social: src/lib/social/providers.ts 9 channels (website LIVE keyless; others MOCK
  unless env creds ⇒ safe local-only). Google link provisions google+youtube.
  Consoles /agents & /social; APIs /api/agents/* and /api/social/*. Content action
  `polish` + `draft-social` in /api/content/[id].
- RBAC added `agents:manage`. New Prisma models Agent, AgentRun, SocialConnection,
  PlatformIdentity; migrations 20261010194902_agents_and_social +
  20261010195430_collector_agent_and_report_source.
- User's fork building blocks to wire later (NOT bundled): Agent-Reach (social read/
  search, no fee), openwa (WhatsApp gateway), crawl4ai/firecrawl/scrapling, cobalt,
  langfuse, moneyprinterturbo/open-edit/voicestudio, software-agent-sdk/OpenHands.
- AI engine: src/lib/llm.ts shared layer — priority Groq (free, no card;
  GROQ_API_KEY/GROQ_MODEL) → local Ollama (OLLAMA_ENABLED/OLLAMA_BASE_URL/
  OLLAMA_MODEL, free+offline) → OpenAI → offline heuristics. ai.ts/writer.ts call
  chatJson(); /api/health reports aiProvider/aiModel. OpenAI acct had $0 credits,
  so its key is disabled in .env and Ollama (qwen2.5:7b) is the live engine.
- Push trap: origin remote embeds a stale token; before pushing run
  `git remote set-url origin "https://${GITHUB_TOKEN}@github.com/safwt771754091s-crypto/Taiz-now-.git"`.
- Social LIVE = website + telegram only; FB/X/IG/WhatsApp/YouTube/TikTok/LinkedIn are
  MOCK until real creds are supplied (X needs an OAuth2 user token to post).
- Scheduled publishing: SocialPost.status draft|scheduled|published|failed +
  scheduledAt/error. src/lib/social/scheduler.ts {scheduleContent, releaseDuePosts};
  /api/social/publish action schedule-content; publisher agent releases due posts.
  UI: SocialConsole "جدولة النشر". Migration 20261010210000_scheduled_publishing.
- Gotcha: after `next build`, kill+restart next-server (start.sh only starts if
  the port is free) or the running server keeps serving stale code.
- Daily notes: .openhands/memory/2026-10-10-taiznow.md

---

> NOTE: This workspace's git remote now points at
> `safwt771754091s-crypto/Teacher-Safwat-` (branch feature/yemeni-smart-teacher,
> PR #1). The `shcool` notes below are from a *prior* use of this same sandbox and
> do NOT describe the Teacher-Safwat- codebase. See the section at the bottom for
> the Teacher-Safwat- (Щ…Ш№Щ„Щ…ЩЉ Ш§Щ„Ш°ЩѓЩЉ Ш§Щ„ЩЉЩ…Щ†ЩЉ) work.

# Project Memory вЂ” shcool (Щ…Щ†ШµШ© Ш§Щ„Щ…ШЇШ±ШіШ© Ш§Щ„Ш±Щ‚Щ…ЩЉШ© / School Digital Platform)


## Live login fixes вЂ” 2026-10-08
- Deploy/demo: `scripts/run_demo.sh` (API :12000, Flutter web :12001). Public hosts work-1 (API) / work-2 (web).
- spatie/laravel-permission runs in **teams mode** (team_foreign_key=tenant_id, teams=true, custom TenantTeamResolver, GlobalTeam::ID=0). Gotchas learned the hard way:
  - The `roles` relation is team-scoped. On the *unauthenticated* login endpoint the team resolved to global (0), so school roles came back `[]` and Flutter could not route to teacher/parent/student portals. Fix: `app(PermissionRegistrar::class)->setPermissionsTeamId($user->tenant_id ?? GlobalTeam::ID)` BEFORE issuing the token (abilities derive from perms) and serialising UserResource. In tests/seeds you must also setPermissionsTeamId before assignRole or you get "There is no role named X".
  - `permissions` field in UserResource is empty on login by design; `/auth/me` returns roles + perms (teacher=22).
- Flutter Dio gotcha: Dio concatenates baseUrl+path verbatim, so base `.../api/v1` + path `auth/login` => `.../api/v1auth/login` (404). ApiClient normalises the base to end in a single `/`.
- Route authz: `portal/parent` used `permission:parents.view` (admin perm); the `parent` role lacks it. Changed to `role_or_permission:parent|parents.view`. Rule: portal self-service routes must use roles, not admin view permissions.
- Browser E2E: Playwright chromium headless. Flutter web needs `flt-semantics-placeholder` clicked (via `el.evaluate(el=>el.click())`, not `.click()` вЂ” outside viewport) then read `flt-semantics` aria-labels for text.
- White-page on cold load: CanvasKit is ~7MB; the static HTML renders nothing until Flutter's first frame. Fixed in `mobile/web/index.html`: static Arabic boot screen (removed on `flutter-first-frame`), 30s watchdog message, and unregister stale service workers + clear caches (a cached pre-fix main.dart.js kept serving the 404 URL bug). Rebuild demo with `flutter build web --release --pwa-strategy=none --dart-define=API_BASE_URL=...`.
- Seeds: owner/admin platform (tenant_id null, GlobalTeam); manager/teacher1..4/parent/student in tenant 4. All password `password`.

## What this is
National school-management platform. Laravel API + MySQL backend, Flutter (web + Android) clients
consuming the same API. Official repo: https://github.com/safwt771754091s-crypto/shcool .
The Laravel app lives in `backend/`; the repo root holds README + .gitignore.

## Requirements from the user (durable)
- The database MUST be independent of any other project. Use MySQL `school_platform` with the
  dedicated `school` user (backend/.env). Never share tables with another project.
- This repo is the official repository.
- Deliver in 4 phases; do NOT build everything at once (avoid weak code).
  - Phase 1: admin hierarchy, DB, multi-tenancy, RBAC, auth. (COMPLETE, commit 41872ca)
  - Phase 2: academic structure, teaching prep notebooks, sports league, interactive
    activities, mini-app registry. (COMPLETE, commit 2d56091)
  - Phase 3: students, guardians, teachers, attendance, exams/grades, offline sync.
    (COMPLETE, commit 173185b, pushed origin/master)
  - Phase 4: notifications (SMS/WhatsApp), reports, parent/student portals.
    (COMPLETE, commit 2fd0582, pushed origin/master)
- Competition/ranking is a core component: ranking between students, classes, schools,
  governorate education offices, up to the Ministry.
- Sports league must run qualifiers up the ladder:
  sections -> classes -> schools -> directorates (Щ…Ш±Ш§ЩѓШІ Ш§Щ„ШЄШ±ШЁЩЉШ©) -> governorates -> final.
- Mini-apps: each school has one, directorate/governorate/ministry aggregate; schools inherit
  ancestor apps.

## Architecture (see daily log for detail)
- Hierarchy = ONE `organizations` table (ministry|governorate|directorate|school|branch, levels
  1..5, materialized `path`). A **school is the tenant boundary**; branches inherit its tenant_id.
- RBAC: spatie/laravel-permission v8, teams mode, `team_foreign_key = tenant_id`.
- Sanctum tokens + TOTP 2FA + audit logs.
- Leaderboard roll-up: student в†’ class в†’ school в†’ directorate в†’ governorate в†’ ministry.
- Competition ladder (`App\Support\Competition\CompetitionScope`): section в†’ class в†’ school в†’
  directorate в†’ governorate в†’ ministry. Used by both the leaderboard and the sports league.
- Tenant scope supports platform-wide rows: `TenantManager::applyScope(..., $includeGlobal)` +
  model `includesGlobalRows()` for rows with tenant_id IS NULL (cups, national templates).

## Key gotchas
- Permission team resolver is instantiated with `new` and no args в†’ zero-arg constructor.
- The team column is part of a composite PK в†’ cannot be NULL; global roles use team id 0.
- Don't inject PermissionRegistrar into TenantManager (circular; sets team before auth).
- Sanctum `*` ability satisfies every `can()` в†’ challenge-token checks must exclude `*`.
- `organizations.level` has no DB default в†’ set it in `refreshHierarchy()` before save.
- FileEditorAction may fail creating files in new nested dirs в†’ `mkdir` first, then retry.
- `updateOrCreate` with a NULL key column matches `IS NULL` every time (rows collapse) в†’ key on
  a non-null column (e.g. name) when scope_id is absent.
- Model defaults must be in `$attributes`, not only the DB default, or the in-memory model after
  `create()` shows null until refresh.
- MySQL 64-char index-name limit в†’ shorten explicit index names.
- **Tenancy must resolve lazily AFTER auth.** `InitializeTenancy` is prepended to the api group,
  so it runs before `auth:sanctum`; resolving the tenant there cached `null` and every
  tenant-scoped query returned nothing over HTTP. Fix: middleware calls `TenantManager::forget()`
  and lets the first scoped query resolve lazily. Symptom: data exists in MySQL but API returns
  empty while service-level tests (which `setTenant()` directly) pass.
- `date` cast stores a datetime string, so `where('attendance_date', $dateString)` and
  `whereBetween` miss в†’ use `whereDate(...)` for day matching.
- Dev environment is ephemeral: PHP, MariaDB and Redis may need reinstalling
  (`apt-get install php-cli php-mysql php-sqlite3 php-mbstring php-xml php-curl php-zip
  php-bcmath php-gd php-intl mariadb-server redis-server php-redis`; start mysqld_safe +
  `redis-server --daemonize yes`). Ensure DB `school_platform` + user `school` exist.
- `git push` prompts for a username (no cached creds) в†’ push via
  `git push https://${GITHUB_TOKEN}@github.com/... master`.

## Later modules (sessions 3-4)
- Notifications/reports/competition: see daily log (Phase 4). Reports types include
  `invoices` now.
- **Finance** (944700f): fee_structures/invoices/invoice_items/payments; invoice totals
  always derived from payments. `App\Services\Finance\FinanceService`.
- **Bulk Excel import** (c00d5e0): `App\Support\Import\SpreadsheetReader` (OpenSpout; use
  `$row->toArray()`, no `getCells()`), `ImportService`, `ImportController`. Idempotent on
  student/employee number.
- **Teacher dashboard** (c00d5e0): `GET /api/v1/teachers/dashboard`; permission
  `teachers.my-assignments`.
- **Gotcha fixed**: `RequestTenantResolver` must not capture the Request (singleton) вЂ” resolve
  it lazily from the container or tenant is NULL over HTTP.

## Flutter client (`mobile/`, f63b3c2)
- Flutter 3.47.7 at `/workspace/tools/flutter` (export PATH; needs `unzip` for web builds).
- `ApiClient` (Dio) unwraps `{data:...}`; `postWithToken()` for the 2FA challenge token.
- Role landing `personaFor()`: teacher/parent/student screens, else staff overview.
- Offline: `OfflineStore` -> `SyncService.flush()` POST `sync/push` (one item per student).
- Verify: `cd mobile && flutter analyze && flutter test` (9 pass), `flutter build web`.
- API base URL is a `--dart-define=API_BASE_URL=...` (default `http://10.0.2.2:8000/api/v1`).

## Verify
```
cd backend && php artisan test     # 90/90 pass (SQLite :memory:), 282 assertions
php artisan migrate:fresh --seed   # MySQL school_platform
cd mobile && flutter test          # 9 pass
```

## Daily logs
- `2026-10-08.md` вЂ” Phase 1 + Phase 2 build details, decisions, seed accounts.

## Owner dashboard + org-create fixes (2026-10-09)
- Owner persona routes to `OwnerDashboardScreen` (hierarchy + mini-apps tiles). Screens `admin_hierarchy_screen.dart`, `mini_apps_screen.dart`; `admin_service.dart` + `organization.dart` model.
- BUG fixed: `organizations.slug` NOT NULL+unique; controller never set it -> SQLSTATE 1364. Model `creating` hook derives unique slug from `code` (fallback `name`).
- BUG fixed (guard split): Sanctum sets `config(auth.defaults.guard)=sanctum` per request; `RoleProvisioner::guard()` read it, so new school roles were written guard `sanctum` while all permissions are guard `web` -> `PermissionDoesNotExist organizations.view for guard sanctum`; school/branch create failed. Fix: pin `protected $guard_name=web` on Role+Permission AND hardcode RoleProvisioner::guard() to web. Never read config(auth.defaults.guard) for spatie.
- Tests: `tests/Feature/OrganizationCreationTest.php` (3). Backend 94/94 (295 assertions); Flutter 14/14.
- Verified live: owner login -> dashboard -> hierarchy -> organizations/tree 200.

## Minister monitoring + manager roles + owner branding (pushed 15d6a93) - 2026-10-09
- Backend: permission `platform.monitor`; MINISTER role = Щ€ШІЩЉШ± Ш§Щ„ШЄШ±ШЁЩЉШ© (read-only, global).
  PlatformMonitoringService (overview totals + full admin tree); MonitoringController
  `GET monitoring/overview` + `GET monitoring/tree` gated by `permission:platform.monitor`.
  Minister seed acct `minister@school-platform.local` (password `password`).
- UserManagementController: POST/GET users, POST users/{id}/roles; assignable roles tenant-scoped only.
- Owner branding: config/app.php `platform.owner` = Ш§Щ„Щ…Щ‡Щ†ШЇШі ШµЩЃЩ€ШЄ Ш§Щ„ШЁШ±ЩЉЩ‡ЩЉ (+owner_title, env
  PLATFORM_OWNER); owner seed renamed; PDF footer ReportController::ownerFooter(); Flutter
  AppConfig.platformOwner shown on splash/login/owner/monitor.
- Flutter personas: Persona {owner, minister, manager, teacher, parent, student, staff};
  minister checked BEFORE owner. _managerRoles = school_manager, branch_manager,
  vice_principal, directorate_admin, student_affairs, accountant, secretary.
  New screens: monitoring_screen (/monitor route), minister_dashboard_screen,
  manager_dashboard_screen, users_screen; admin_service gained monitoringOverview/users/
  createUser/assignRole; model lib/models/monitoring.dart.
- Tests: backend 98/98 (304 assertions) incl MonitoringTest; Flutter 21/21 incl persona_test.
- Demo URLs: platform/web = work-2 (port 12001); API = work-1 (port 12000 /api/v1). Opening
  work-1 directly shows raw JSON. The 'only one page/student view' report was a stale cached
  web bundle; rebuilt with `flutter build web --release --dart-define=API_BASE_URL=<work-1>/api/v1`.
- Push needs token URL: `git remote set-url origin https://${GITHUB_TOKEN}@github.com/safwt771754091s-crypto/shcool.git`.

## Environment reset / reinstall (2026-10-09)
- The sandbox can be rebuilt from scratch: PHP/MariaDB/Redis/Composer disappear
  (only /workspace/tools/flutter survives). `scripts/run_demo.sh` then reports API :000.
- Reinstall (as openhands, sudo works, no password):
  `sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq
   php8.4-cli php8.4-mbstring php8.4-xml php8.4-curl php8.4-zip php8.4-bcmath php8.4-gd
   php8.4-intl php8.4-mysql php8.4-redis mariadb-server redis-server unzip`
  then `sudo ln -sf /usr/bin/php8.4 /usr/local/bin/php` (no `php` on PATH otherwise).
- Start services: `sudo service mariadb start; sudo service redis-server start`
  (data dir /var/lib/mysql persists; mariadb-install-db already done). `vendor/` persists.
- Create DB/user: `sudo mariadb -e "CREATE DATABASE IF NOT EXISTS school_platform ...
  CREATE USER 'school'@'127.0.0.1' IDENTIFIED BY 'school_secret'; GRANT ..."`
- Seed: `cd backend && php artisan migrate:fresh --seed --force`.
- Then `bash scripts/run_demo.sh` (rebuilds Flutter web ~50s, starts API:12000 + web:12001).
- Public: web/platform = work-2 host, API = work-1 host/api/v1.

## Demo resilience (2026-10-09)
- Sandbox reset wipes PHP/MariaDB/Redis AND leaves school_platform with no tables
  (mariadb-server reinstall resets datadir). Symptom: link returns 502/blank, login 500
  'Table school_platform.users doesn't exist'.
- Fix/recovery: `bash scripts/bootstrap_env.sh` (installs pkgs, starts services, creates
  DB+user, seeds if FRESH=1, runs demo). `scripts/run_demo.sh` now sets PATH + sudo fallback.
- `scripts/watchdog.sh` (run detached) restarts mariadb/redis/api/web when they stop.
- After a reset ALWAYS run bootstrap_env.sh, then `cd backend && php artisan migrate:fresh
  --seed --force` if login returns the missing-table error.
- Web render check: screenshot pixel analysis (PIL) - blank page = near-100% white; the app
  renders green theme (246,251,243) bg + (47,106,67) appbar. Flutter canvas hides DOM text.

## Teacher workflow + publish (2026-10-10)
- Teacher daily flow now in Flutter: `attendance_register_screen.dart` (pick assignment+date
  -> roster from `attendance/session`, save via `attendance/register`) and
  `grade_entry_screen.dart` (pick assignment -> exams for subject+section -> enter marks /
  mark absent -> `exams/{id}/grades`). RecordsService gained `sectionStudents`,
  `attendanceSession`, `takeRegister`, `examGrades`. `TeacherService.myAssignments` now returns
  typed `TeachingAssignment` (needs `models/teacher.dart` import). teacher_home has quick actions.
- Report export: `ApiClient.download(path, query)` (Dio `ResponseType.bytes`) +
  `FinanceService.export(type, format)`; ReportsScreen has a PDF/XLSX/CSV menu that calls
  `FilePicker.saveFile(fileName, bytes, mimeType)` (file_picker 13 returns `Uri?`).
  Live-verified: `/reports/export/{csv,xlsx,pdf}` all 200 (pdf 17KB, xlsx 4.7KB).
- Student/parent portals link to `NationalRankingScreen` + `NotificationsScreen`.
- **Android APK build works in this sandbox** (previously blocked). Toolchain:
  `sudo apt-get install openjdk-21-jdk-headless unzip` (Debian trixie has only openjdk-21/25,
  NOT 17) -> `JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64`; Android cmdline-tools
  `commandlinetools-linux-13114758_latest.zip` into `/workspace/tools/android-sdk/cmdline-tools/latest`;
  `sdkmanager --install "platform-tools" "platforms;android-36" "build-tools;36.0.0"` (NDK+CMake
  auto-downloaded by Gradle). `flutter build apk --release` -> 57.9MB `app-release.apk`
  (com.schoolplatform.school_app, minSdk24, debug-signed). Reproducible: `scripts/build_android.sh`.
- Android build takes ~10min (Gradle+NDK download); run it with nohup + poll `/tmp/apk_build.log`.
- Tests: backend 103/103 (324 assertions), Flutter 34/34.
- Push: `git fetch origin` first (a parallel session pushes to master too); `git rebase origin/master`
  then push. Remote reached ffb1bfe.

---

# Щ…Ш№Щ„Щ…ЩЉ Ш§Щ„Ш°ЩѓЩЉ Ш§Щ„ЩЉЩ…Щ†ЩЉ (Yemeni Smart Teacher) вЂ” started 2026-10-10
Repo: safwt771754091s-crypto/Teacher-Safwat-  |  PR #1 from branch feature/yemeni-smart-teacher
Sandbox layout (this workspace, /workspace/project): `backend/` (Laravel 13, PHP 8.4),
`web/` (dependency-free RTL SPA), `scripts/`. The old `shcool` notes above are stale here.

## Stack / env
- Laravel 13.35, PHP 8.4 (binary /usr/bin/php8.4; symlink to /usr/local/bin/php),
  MySQL (Debian trixie `mariadb-server`), Composer 2.10.3. Sanctum ^4.3, smalot/pdfparser ^2.12.
- DB `teacher_safwat`, user ts/ts_secret. `php artisan migrate:fresh --seed --force` seeds
  Grade-1 Yemeni curriculum (CurriculumSeeder) + demo users/games (UsersAndGamesSeeder).
- Demo users password `password`: owner@school.ye, teacher@school.ye, parent@school.ye,
  student@school.ye. API :12000 (`/api/v1`), web :12001.
- Tests use SQLite :memory: вЂ” needed `sudo apt-get install php8.4-sqlite3` (not default installed).
- Run: `bash scripts/bootstrap_env.sh` (full rebuild; FRESH=1 to reseed) / `scripts/run_demo.sh`.

## Key design decisions (durable)
- Grounded AI: `AiTeacherService` composes explanations ONLY from stored lesson sections or
  approved summary; returns grounded:true, pages:[..], or needs_content:true when nothing
  approved вЂ” never invents. Prefer approved summary OR sections, not both, else points duplicate.
- Exercise verification: `ExerciseService` verifies numeric answers by real arithmetic
  (eval-guarded) then reference-answer match; normalizes Arabic-Indic digits. Regex gotcha:
  use `~...~` delimiters for patterns containing `/` (e.g. `[-+*/().\d\s]`).
- Roles enforced server-side via `EnsureRole` middleware (`role:owner`, `role:student`, ...).
- Exercise/lesson IDs shift after reseed вЂ” don't hardcode IDs in smoke scripts.
- textbook_pages columns are `status` (raw|extracted|reviewed) + `review_note`, NOT
  source/review_status. Seeder `ensurePages()` populates pages so `/lessons/{id}/pages/{n}` works.
- Frontend files: web/assets/{config.js,api.js,app.js,styles.css}, hash router (#/lesson/3).
  Gotcha: global is window.API; state is window.API.state (don't destructure off window).
- Full curriculum: `FullCurriculumSeeder` seeds ALL 12 grades Г— official subjects
  (88 subjects, 337 lessons, 988 exercises) from the official TOC. Grades 1 core
  subjects are authored in full by CurriculumSeeder (runs first). Grades >1 lessons
  are *structural scaffolds* (title + generic points + generated exercises + a visible
  "Щ…Ш­ШЄЩ€Щ‰ Щ‡ЩЉЩѓЩ„ ШЈЩ€Щ„ЩЉ" note) вЂ” never presented as verified textbook prose.
- Owner branding: config/platform.php owner.name default = 'Ш§Щ„Щ…Ш№Щ„Щ… ШµЩЃЩ€ШЄ'; public
  `GET /api/v1/config` returns {app, platform, owner}; web app.js loadConfig() shows it.
- Tests now 34 (149 assertions) incl. every-grade coverage + page review.
- Content pipeline (owner/teacher): POST /textbooks в†’ /upload-pdf|/upload-page в†’
  GET /textbooks/{id}/pages (list + status counts) в†’ PATCH /pages/{id} (edit+reviewed) в†’
  /draft-lessons в†’ /lessons/{id}/generate-summary в†’ /summaries/{id}/approve (publishes
  lesson) в†’ /textbooks/{id}/publish. Web: content screen 'Щ…Ш±Ш§Ш¬Ш№Ш© Ш§Щ„ШµЩЃШ­Ш§ШЄ' panel.
  Pages status enum = raw|extracted|reviewed. OCR is NOT bundled: image pages need the
  admin to type/confirm text (source of record is the image, nothing is guessed).

## Content ingestion (yemenbooks) вЂ” 2026-10-10 onward
- Real Yemeni books come from yemenbooks.com; per-track editions (aden/sanaa/common).
  Manifests in `backend/database/data/` (yemen_books_all.json 272; yemen_aden_full.json 169).
- `textbooks:import {manifest} --offset --count` downloads + extracts; OCR via tesseract
  for scanned editions (bundled now; the earlier "OCR not bundled" note is stale).
  `--offset/--count` sharding => run parallel shards (logs /tmp/aden_sA.log, sB.log).
  Pace ~3.5 min/book; resume-safe (skips books whose pages are mostly readable).
- `textbooks:segment [--exercises] [--force]` builds draft lessons. Heading-anchored:
  `Ш§Щ„ШЇШ±Ші` = lesson; `Ш§Щ„Щ€Ш­ШЇШ©|Ш§Щ„ЩЃШµЩ„` = unit; contents pages (>=3 headings) skipped; books
  with only units use `segmentByUnit()` (intro -> "Щ…Щ‚ШЇЩ…Ш© Ш§Щ„ЩѓШЄШ§ШЁ"). PCRE: use `\x{0660}`
  not `\u{0660}`. `--exercises` also extracts the book's OWN task lines as unverified
  short_answer drafts (answer=NULL) вЂ” never invents answers; idempotent.
- Grounded explain cites the source page per point: "1. <point> (ШµЩЃШ­Ш© 7)".
- Web app is the RTL SPA in `web/` (php -S), NOT Flutter. Auth: `api/v1/auth/login`.
- DATA-LOSS TRAP (fixed 2026-10-10): draftExercisesFromLesson() used to delete
  every exercise with verified_at=NULL, which wiped the 988 seeded Grade-1
  exercises (also NULL). Now drafts carry `is_draft=true`; delete only is_draft
  rows; draftLessonsFromPages() refuses books with published lessons; learner
  exercise list hides is_draft; verify (with answer) clears is_draft.
- Seeders are now idempotent (Textbook::firstOrCreate; lesson title lookup +
  skip when sections exist), so `php artisan db:seed` restores authored content
  WITHOUT duplicating the 51+ imported pdf books' lessons. Use this to recover
  after any accidental wipe instead of migrate:fresh (which discards OCR pages).

## (shcool notes, continued вЂ” stale)
- Push can prompt for a password if the origin URL token is stale; fix with
  `git remote set-url origin "https://${GITHUB_TOKEN}@github.com/safwt771754091s-crypto/shcool.git"`
  and `GIT_TERMINAL_PROMPT=0` to fail fast instead of hanging.
- Watchdog now self-heals full sandbox resets: `scripts/watchdog.sh` detects PHP/mariadbd gone
  (guard: skip while apt-get/dpkg running) and re-runs bootstrap_env.sh; bootstrap_env.sh starts
  the watchdog at the end. `service mariadb start` can briefly fail right after apt install because
  dpkg renames /etc/init.d/* to *.dpkg-new mid-install - just wait.

- Daily working notes: .openhands/memory/2026-10-10.md (Aden import, OCR cmap fix, parallel sharding).

## منصة الهوية والأمن + وكيل «الحارس» (2026-10-10)
- 7th agent GUARDIAN (الحارس). Models: PlatformIdentity/ManagedPage/PlatformBrand/PlatformEmailAccount/ConfigSnapshot/SecurityEvent. Migration guardian_agent_kind.
- Services: src/lib/platform/{brand,email,pages}.ts, src/lib/security/{events,config}.ts. Email domain PLATFORM_DOMAIN (default taiznow.ye); pages SYSTEM_PAGES -> ManagedPage; public /p/{slug}.
- Security: configHash = canonical JSON sha256; approve-baseline/scan(restore) via /api/security; events on brand/email/page/role/password/failed-login.
- Routes /api/platform{,/email,/pages}, /api/security. UI /platform /security /agents. RBAC platform:manage, security:manage.
- Tests 48 pass (6 files). Build 23 pages. Live verified: tamper->drift->restore.

## تعز الآن / TaizNow (safwt771754091s-crypto/Taiz-now-) — started 2026-10-11
Branch feat/platform-identity-guardian. Next.js 15 + Prisma/Postgres + NextAuth5 + Tailwind, Arabic RTL. Live at https://work-1-xkreksmgeomyiarv.prod-runtime.all-hands.dev/ (owner@taiznow.ye / password). Health: aiProvider=ollama, model=qwen2.5:7b. 63 tests.
- Facebook Page publishing is LIVE and PERMANENT (page تعز الآن id 1387357084463622, app 28668335016161683 "TaizNow Pages", token expiresAt=null). Two connect paths on /social: one-click OAuth ("ربط بنقرة واحدة") and paste-token (POST /api/social/facebook/token, optional `appSecret` field mints a permanent token without storing the secret). Scope that matters: pages_manage_posts (+pages_read_engagement); without it publish fails (#200). The Meta app's USE CASE must be "إدارة كل شيء على صفحتك" (Manage everything on your Page) and the scope must be added under that use case — "Facebook Login for Business"/Marketing use cases never expose it. A Page token minted from a SHORT-LIVED user token inherits ~1h expiry; mint a permanent one via a valid App Secret (fb_exchange_token) or Graph API Explorer "Extend Access Token". Verify with debug_token (data.app_id/application/scopes/expires_at); app NAMES can be duplicated so always ask for the App ID. SocialConnection (with the token) lives in postgres -> an env reset loses it. `scripts/start.sh` strips inherited FACEBOOK_*/OPENAI_* env so .env wins (Next only fills missing vars).
- PROXY GOTCHA: use requestOrigin(req) (x-forwarded-host/proto) for OAuth redirect_uri, not new URL(req.url) (gives localhost).
- Telegram channel @TaizNowNews is LIVE. See daily log 2026-10-10.md for details.

## The True Path Islam (TruePath) — /workspace/project, started 2026-10-13
Multi-lingual dawah platform. Next.js 16 + Prisma 7 + NextAuth v5 + Tailwind v4, 6 locales
`/[locale]` (en/ar/zh/hi/ja/ru); src/proxy.ts does root Accept-Language redirect.
Modules: /quran (+/[surah], tafsir toggle), /hadith (search+topics+grades), /biography,
/qa (AI draft->scholar review), /shahada. Staff UI /admin (admin@trupath.local/admin12345).
DB: docker "trupath-db" pg16 localhost:5432, db/user/pass=trupath. Content: 6236 verses /
31180 translations / 15975 tafsir / 36435 hadiths. Deploy: Dockerfile(standalone)+docker-compose.yml.
Public URL: https://work-1-rmzjviikgmvmxyqz.prod-runtime.all-hands.dev (maps to port 12000; `npm run start` = scripts/start.sh -> .next/standalone/server.js on 12000). Health: ai=mock/gpt-4o-mini.
Redesign (2026-10-13): "refined manuscript" design system in globals.css; fonts Fraunces/Manrope/IBM_Plex_Sans_Arabic/Amiri_Quran (self-hosted via next/font, /_next/static/media). All 6 dicts+types kept in parity. See daily log 2026-10-13.md.
RECOVERY: DB is NOT persistent across sandbox resets (docker volume is ephemeral); site 502s when dockerd+postgres are gone. Full content re-import is OFFLINE from .cache/ingest/ (482 files, ~90s). Run scripts/bootstrap.sh (starts dockerd+db, migrates, seeds, builds, serves on 12000). Docker needs root (`sudo -n docker`). After DB recovery you MUST rebuild — home page is SSG and caches stats=0 at build time.
See daily log 2026-10-13.md for gotchas (safe() SSG fallback, hadith grade defaults, proxy rename, restart EADDRINUSE serves stale UI).
