#!/usr/bin/env bash
# Serve the production build with the Next.js standalone server.
# Assembles the assets the standalone output expects, then binds PORT (default 12000).
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-12000}"
export PORT HOSTNAME="0.0.0.0"

if [ ! -f .next/standalone/server.js ]; then
  echo "No standalone build found. Run: npm run build"
  exit 1
fi

# Standalone output does not include static/public/generated assets.
mkdir -p .next/standalone/.next .next/standalone/src
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true
cp -r src/generated .next/standalone/src/generated
cp -r prisma .next/standalone/prisma 2>/dev/null || true

cd .next/standalone
exec node server.js
