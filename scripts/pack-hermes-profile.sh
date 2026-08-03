#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/hermes"
OUT_DIR="$ROOT/exports"
NAME="warframe-build-agent"
STAGING="$OUT_DIR/.staging-$NAME"
ARCHIVE="$OUT_DIR/${NAME}-hermes-profile.tar.gz"

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
