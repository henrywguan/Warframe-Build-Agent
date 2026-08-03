---
name: cleanup-simplify
description: Clean up and simplify code, optionally run full overlay/web integrity checks with `/cleanup-simplify -all`.
---

# Cleanup & simplify

## When to use

- After a feature or bug fix lands
- Before opening/updating a PR
- User says “clean up”, “simplify”, “tidy”, or “refactor lightly”
- User runs `/cleanup-simplify` or `/cleanup-simplify -all`
- Parent agent finished edits and should verify nothing got messy

## Modes

### Default — `/cleanup-simplify`

1. Review `git diff` / changed files only.
2. Simplify without changing behavior (see subagent rules).
3. Run:

```bash
./scripts/cleanup-verify.sh
```

### Full integrity — `/cleanup-simplify -all`

Runs the default cleanup pass **plus** product integrity checks for overlay + web UI:

1. Do the default cleanup-simplify workflow on the current diff.
2. Run the full suite:

```bash
./scripts/cleanup-verify-all.sh
```

That suite verifies:

1. **Overlay recommendations** against an Overframe-style fixture loadout + screenshot asset (`overlay/tests/fixtures/`).
2. **Overlay UI buttons** exist, are enabled, and are signal-wired (offscreen Qt).
3. **Overlay chat** returns proper replies via mocked HTTPS (no real key required).
4. **Web UI wiring** — Ordis stage, chat panel, composer, suggestion chips, API routes linked.
5. **Web chat agent** — slash-command and model turn resolution (`resolveChatTurn`).
6. **Talking Ordis** — mood helpers + `data-mood="speaking"` render on reply trigger path.
7. **Functional / simplified** — typecheck, unit tests, web lint/build, overlay `--verify-external`, no conflict markers.

Notes:

- Overlay v1 recommendations are rule-based from loadout fields (not OCR). The fixture encodes a realistic Overframe-style build; the PNG is the capture stand-in used by integrity tests.
- Chat model paths are mocked in CI; live keys are optional for local smoke.

## Done when

- Diff is simpler or unchanged for good reason
- Default mode: `./scripts/cleanup-verify.sh` exits 0
- `-all` mode: `./scripts/cleanup-verify-all.sh` exits 0
- No unrelated files were rewritten
