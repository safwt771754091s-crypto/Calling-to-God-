#!/usr/bin/env bash
# Bring the TruPath stack up after a cold container/sandbox start:
#   1. start the Docker daemon (needs root),
#   2. start the Postgres container and wait for it,
#   3. apply migrations and seed from the on-disk ingest cache when the DB is empty,
#   4. build if missing, then serve the standalone server on $PORT (default 12000).
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-12000}"
export PORT HOSTNAME="0.0.0.0"

# --- Docker daemon -----------------------------------------------------------
if ! docker info >/dev/null 2>&1; then
  echo "→ Starting Docker daemon…"
  if ! sudo -n docker info >/dev/null 2>&1; then
    sudo -n nohup dockerd >/tmp/dockerd.log 2>&1 &
    for _ in $(seq 1 30); do sudo -n docker info >/dev/null 2>&1 && break; sleep 1; done
  fi
fi
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="sudo -n docker"

# --- Database ----------------------------------------------------------------
echo "→ Ensuring Postgres is running…"
$DOCKER compose up -d db
for _ in $(seq 1 30); do
  $DOCKER exec project-db-1 pg_isready -U trupath -d trupath >/dev/null 2>&1 && break
  sleep 1
done

echo "→ Applying migrations…"
npx prisma migrate deploy

# Re-seed only when the database is empty (idempotent ingest scripts skip
# existing rows anyway, but this avoids re-running the whole import).
VERSE_COUNT=$(npx tsx -e 'import "dotenv/config";import p from "./src/lib/db";p.verse.count().then(c=>{console.log(c);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})' 2>/dev/null | tail -1)
if [ "${VERSE_COUNT:-0}" = "0" ]; then
  echo "→ Empty database detected — importing content from .cache/ingest…"
  # Ingest is best-effort: a partially-populated DB can make a rerun collide on
  # unique keys, and that must not abort the whole bring-up.
  npm run ingest:quran  || echo "warn: ingest:quran failed (continuing)"
  npm run ingest:tafsir || echo "warn: ingest:tafsir failed (continuing)"
  npm run ingest:hadith || echo "warn: ingest:hadith failed (continuing)"
fi
npm run seed        || echo "warn: seed failed (continuing)"
npm run seed:agents || echo "warn: seed:agents failed (continuing)"

# --- Build + serve -----------------------------------------------------------
if [ ! -f .next/standalone/server.js ]; then
  echo "→ No build found — building…"
  npm run build
fi

mkdir -p .next/standalone/.next .next/standalone/src
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true
cp -r src/generated .next/standalone/src/generated
cp -r prisma .next/standalone/prisma 2>/dev/null || true

cd .next/standalone
exec node server.js
