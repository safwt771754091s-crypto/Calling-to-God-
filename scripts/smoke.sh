#!/usr/bin/env bash
# Smoke-test a running instance end to end. Exits non-zero on the first failure,
# so it is safe to gate a deploy on it.
#
#   scripts/smoke.sh                        # defaults to http://localhost:12000
#   scripts/smoke.sh https://my-app.vercel.app
set -uo pipefail

BASE="${1:-http://localhost:12000}"
BASE="${BASE%/}"
fail=0

check() { # <name> <path> [expected-http, comma-separated]
  local name="$1" path="$2" want="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$BASE$path")
  if echo ",$want," | grep -q ",$code,"; then
    printf "  \033[32m✓\033[0m %-28s %s\n" "$name" "$code"
  else
    printf "  \033[31m✗\033[0m %-28s %s (want %s)\n" "$name" "$code" "$want"
    fail=1
  fi
}

check_json() { # <name> <path> <jq-ish python check>
  local name="$1" path="$2" expr="$3"
  local body
  body=$(curl -s --max-time 20 "$BASE$path")
  if echo "$body" | python3 -c "import sys,json;d=json.load(sys.stdin);assert $expr" 2>/dev/null; then
    printf "  \033[32m✓\033[0m %-28s %s\n" "$name" "ok"
  else
    printf "  \033[31m✗\033[0m %-28s bad body\n" "$name"
    fail=1
  fi
}

echo "Smoke test → $BASE"

check "home"            "/" "200,307"
check "quran section"   "/ar/quran"
check "hadith section"  "/en/hadith"
check "qa section"      "/en/qa"
check "health"          "/api/health"
check "surahs API"      "/api/quran/surahs"
check "hadith API"      "/api/hadith/collections"
check "admin (auth)"    "/admin" "200,307"

check_json "health payload" "/api/health" "'status' in d or 'db' in d or 'ok' in d"

if [ "$fail" = 0 ]; then
  echo "✓ all smoke checks passed"
else
  echo "✗ smoke test failed"
fi
exit "$fail"
