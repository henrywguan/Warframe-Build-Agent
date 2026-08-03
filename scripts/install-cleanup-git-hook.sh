#!/usr/bin/env bash
# Optional: install a pre-commit hook that runs cleanup-verify.sh.
# This is mechanical verification only (not the LLM subagent).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK="$ROOT/.git/hooks/pre-commit"

mkdir -p "$ROOT/.git/hooks"
cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
exec "$ROOT/scripts/cleanup-verify.sh"
EOF
chmod +x "$HOOK" "$ROOT/scripts/cleanup-verify.sh"

echo "Installed pre-commit hook -> scripts/cleanup-verify.sh"
echo "To uninstall: rm .git/hooks/pre-commit"
