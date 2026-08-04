#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/hermes"
OUT_DIR="$ROOT/exports"
NAME="warframe-build-agent"
STAGING="$OUT_DIR/.staging-$NAME"
ARCHIVE="$OUT_DIR/${NAME}-hermes-profile.tar.gz"
WITH_KNOWLEDGE=0

for arg in "$@"; do
  case "$arg" in
    --with-knowledge) WITH_KNOWLEDGE=1 ;;
    -h|--help)
      echo "Usage: $0 [--with-knowledge]"
      echo "  Packs hermes/ → exports/${NAME}-hermes-profile.tar.gz"
      echo "  --with-knowledge  also run pack-knowledge-sidecar.sh"
      exit 0
      ;;
  esac
done

rm -rf "$STAGING"
mkdir -p "$STAGING/$NAME" "$OUT_DIR"

# Profile import expects a top-level directory named like the profile.
cp -R "$SRC/." "$STAGING/$NAME/"

# Keep the archive lean and import-safe.
rm -rf "$STAGING/$NAME/.git" "$STAGING/$NAME/node_modules"

tar -C "$STAGING" -czf "$ARCHIVE" "$NAME"
rm -rf "$STAGING"

echo "Wrote $ARCHIVE"
echo
echo "Import into Hermes Desktop / CLI with:"
echo "  hermes profile import \"$ARCHIVE\" --name $NAME"
echo "  # or install from the source folder:"
echo "  hermes profile install \"$SRC\" --name $NAME --alias"
echo
echo "Local LLM (Qwen/Ollama): see hermes/LOCAL_LLM.md"
echo "Point terminal.cwd at a Warframe-Build-Agent checkout for full offline knowledge."

if [[ "$WITH_KNOWLEDGE" -eq 1 ]]; then
  echo
  "$ROOT/scripts/pack-knowledge-sidecar.sh"
fi
