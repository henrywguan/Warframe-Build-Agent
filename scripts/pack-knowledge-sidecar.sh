#!/usr/bin/env bash
# Pack data/knowledge/ for Hermes / offline transfer (separate from the lean profile).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/data/knowledge"
OUT_DIR="$ROOT/exports"
NAME="warframe-build-agent-knowledge"
ARCHIVE="$OUT_DIR/${NAME}.tar.gz"

if [[ ! -f "$SRC/manifest.json" ]]; then
  echo "No knowledge pack at $SRC — run: npm run knowledge -- pull" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
# Exclude caches / large Playwright dumps if present; keep digests + indexes.
tar -C "$ROOT/data" \
  --exclude='knowledge/cache' \
  --exclude='knowledge/exports' \
  --exclude='knowledge/**/*.tmp' \
  -czf "$ARCHIVE" knowledge

echo "Wrote $ARCHIVE"
echo
echo "Extract into a Warframe-Build-Agent checkout:"
echo "  tar -xzf \"$ARCHIVE\" -C /path/to/Warframe-Build-Agent/data"
echo "Then verify:"
echo "  npm run knowledge -- status"
