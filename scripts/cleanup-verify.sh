#!/usr/bin/env bash
# Mechanical verification for the cleanup-simplify agent.
# Keeps the app working: typecheck + unit tests (+ overlay checks when present).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> cleanup-verify: repo root = $ROOT"

if [[ -f package.json ]]; then
  if [[ ! -d node_modules ]]; then
    echo "==> npm install"
    npm install
  fi
  echo "==> npm run typecheck"
  npm run typecheck
  echo "==> npm test"
  npm test
fi

if [[ -d overlay/wf_overlay && -d overlay/tests ]] && compgen -G "overlay/tests/test_*.py" > /dev/null; then
  echo "==> overlay unit tests"
  (cd overlay && python3 -m unittest discover -s tests -v)
  if [[ -f overlay/wf_overlay/__main__.py ]]; then
    echo "==> overlay external-only verify"
    (cd overlay && python3 -m wf_overlay --verify-external)
  fi
elif [[ -d overlay ]]; then
  echo "==> skip overlay checks (no overlay/tests/test_*.py yet)"
fi

web_changed=0
if git diff --name-only HEAD 2>/dev/null | grep -q '^web/'; then
  web_changed=1
fi
if [[ -d web && -f web/package.json ]] && [[ "${CLEANUP_VERIFY_WEB:-0}" == "1" || "$web_changed" == "1" ]]; then
  echo "==> web lint (best effort)"
  if [[ ! -d web/node_modules ]]; then
    npm --prefix web install
  fi
  npm --prefix web run lint || true
elif [[ -d web ]]; then
  echo "==> skip web lint (no web/ diff; set CLEANUP_VERIFY_WEB=1 to force)"
fi

echo "==> cleanup-verify: PASS"
