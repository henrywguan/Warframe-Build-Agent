#!/usr/bin/env bash
# Full integrity suite for `/cleanup-simplify -all`.
# Covers cleanup verify + overlay UI/chat/fixture checks + web UI/Ordis/chat tests.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> cleanup-verify-all: repo root = $ROOT"

echo "==> 0) standard cleanup-verify"
CLEANUP_VERIFY_WEB=1 ./scripts/cleanup-verify.sh

echo "==> 1-3) overlay integrity (fixture recommendations, buttons, chat mocks)"
if [[ ! -d overlay/wf_overlay ]]; then
  echo "ERROR: overlay/ missing" >&2
  exit 1
fi
if [[ -f overlay/requirements.txt ]]; then
  python3 -m pip install -q -r overlay/requirements.txt || true
fi
# Offscreen Qt needs EGL in many CI images.
if ! python3 -c "from PySide6.QtWidgets import QApplication" >/dev/null 2>&1; then
  echo "==> installing Qt offscreen system libs (best effort)"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq && sudo apt-get install -y -qq libegl1 libxkbcommon0 libgl1 libdbus-1-3 || true
  fi
fi
(
  cd overlay
  export QT_QPA_PLATFORM="${QT_QPA_PLATFORM:-offscreen}"
  python3 -m unittest discover -s tests -v
  python3 -m wf_overlay --verify-external
)

echo "==> 4-6) web UI integrity (elements, chat turn, Ordis mood/animation hooks)"
if [[ ! -d web/node_modules ]]; then
  npm --prefix web install
fi
npm --prefix web run lint
npm --prefix web run test
npm --prefix web run build

echo "==> 7) space / simplification gate (fail on leftover conflict markers)"
# Exclude this script itself — it contains the marker strings in the grep pattern.
if git grep -nE '^(<<<<<<<|>>>>>>>|=======)' -- \
  ':!*.md' ':!docs/**' ':!scripts/cleanup-verify-all.sh' >/dev/null 2>&1; then
  echo "ERROR: merge conflict markers present" >&2
  git grep -nE '^(<<<<<<<|>>>>>>>|=======)' -- \
    ':!*.md' ':!docs/**' ':!scripts/cleanup-verify-all.sh' || true
  exit 1
fi

echo "==> cleanup-verify-all: PASS"
echo "Covered:"
echo "  1. Overlay recommendations from Overframe-style fixture loadout + screenshot asset"
echo "  2. Overlay quick-action / pin / close buttons wired (offscreen Qt)"
echo "  3. Overlay chat client returns proper mocked replies"
echo "  4. Web UI wiring integrity (Ordis, composer, APIs, chips)"
echo "  5. Web chat turn resolution (slash + model path)"
echo "  6. Ordis mood/speaking trigger helpers + stage data-mood render"
echo "  7. Typecheck/tests/build + external-only overlay policy"
