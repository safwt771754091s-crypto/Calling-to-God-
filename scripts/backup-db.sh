#!/usr/bin/env bash
# Backup / restore the PostgreSQL database referenced by DATABASE_URL.
#
#   scripts/backup-db.sh                    # dump to backups/trupath-<ts>.sql.gz
#   scripts/backup-db.sh --restore FILE     # restore a .sql or .sql.gz dump
#
# Uses pg_dump/pg_restore when available, otherwise falls back to the postgres
# container via `docker exec` so it works with the bundled compose stack.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] && set -a && . ./.env && set +a

: "${DATABASE_URL:?DATABASE_URL is not set}"

MODE="backup"
FILE=""
if [ "${1:-}" = "--restore" ]; then
  MODE="restore"
  FILE="${2:?usage: backup-db.sh --restore FILE}"
fi

mkdir -p backups

# Resolve a working docker command (rootless may need sudo, as in bootstrap.sh).
DOCKER="docker"
docker info >/dev/null 2>&1 || DOCKER="sudo -n docker"

# Pick a pg_dump/pg_restore: local client first, else the compose container.
if command -v pg_dump >/dev/null 2>&1; then
  dump() { pg_dump --no-owner --no-privileges "$DATABASE_URL"; }
  restore() { gunzip -c "$1" | psql --quiet "$DATABASE_URL"; }
elif $DOCKER ps --format '{{.Names}}' 2>/dev/null | grep -q "db"; then
  dump() { $DOCKER exec -i project-db-1 pg_dump --no-owner --no-privileges -U "${POSTGRES_USER:-trupath}" "${POSTGRES_DB:-trupath}"; }
  restore() { gunzip -c "$1" | $DOCKER exec -i project-db-1 psql -U "${POSTGRES_USER:-trupath}" "${POSTGRES_DB:-trupath}"; }
else
  echo "error: no pg_dump client and no running db container" >&2
  exit 1
fi

if [ "$MODE" = "backup" ]; then
  OUT="backups/trupath-$(date +%Y%m%d-%H%M%S).sql.gz"
  echo "→ Dumping database to $OUT"
  dump | gzip > "$OUT"
  echo "✓ Backup complete ($(du -h "$OUT" | cut -f1))"
else
  [ -f "$FILE" ] || { echo "error: $FILE not found" >&2; exit 1; }
  echo "→ Restoring $FILE (this overwrites current data)"
  restore "$FILE"
  echo "✓ Restore complete"
fi
