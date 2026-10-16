#!/usr/bin/env bash
# Keep the TruPath stack alive across sandbox hiccups.
#   - start dockerd + the Postgres container if they are gone,
#   - re-run bootstrap (migrate/seed/build/serve) if the app on $PORT stops
#     answering, but never while another bootstrap is already running.
# Intended to be started once with:  nohup bash scripts/watchdog.sh &>/tmp/watchdog.log &
set -uo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-12000}"
HEALTH="http://localhost:${PORT}/api/health"
LOCK=/tmp/trupath-bootstrap.lock

log() { echo "[$(date +%H:%M:%S)] $*"; }

for _ in $(seq 1 100000); do
  # 1. Docker daemon
  if ! docker info >/dev/null 2>&1 && ! sudo -n docker info >/dev/null 2>&1; then
    log "dockerd down — starting"
    sudo -n nohup dockerd >/tmp/dockerd.log 2>&1 &
    for _ in $(seq 1 30); do sudo -n docker info >/dev/null 2>&1 && break; sleep 1; done
  fi

  # 2. Postgres container
  DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="sudo -n docker"
  if ! $DOCKER ps --format '{{.Names}}' 2>/dev/null | grep -q '^project-db-1$'; then
    log "postgres container down — starting"
    $DOCKER compose up -d db >/tmp/watchdog-db.log 2>&1
  fi

  # 3. Application
  if ! curl -fsS --max-time 5 "$HEALTH" >/dev/null 2>&1; then
    if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
      log "app down but a bootstrap (pid $(cat "$LOCK")) is already running"
    else
      log "app down — running bootstrap"
      ( echo $$ >"$LOCK"; nohup bash scripts/bootstrap.sh >>/tmp/bootstrap.log 2>&1; rm -f "$LOCK" ) &
    fi
  fi

  sleep 20
done
