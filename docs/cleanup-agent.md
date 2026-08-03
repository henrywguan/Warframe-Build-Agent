# Cleanup-simplify (`/cleanup-simplify` and `-all`)

Keeps the codebase tidy after changes: simplify touched code, delete dead weight, and **keep the app working** (tests/typecheck green).  
Supports a full integrity mode for overlay + web UI.

## Quick start

| Mode | Cursor command | Local script |
| --- | --- | --- |
| Default | `/cleanup-simplify` | `./scripts/cleanup-verify.sh` or `npm run cleanup:verify` |
| Full integrity | `/cleanup-simplify -all` | `./scripts/cleanup-verify-all.sh` or `npm run cleanup:verify:all` |

Cursor slash-command pack: [`.cursor/commands/cleanup-simplify.md`](../.cursor/commands/cleanup-simplify.md)

## What’s in the repo

| Piece | Role |
| --- | --- |
| [`.cursor/commands/cleanup-simplify.md`](../.cursor/commands/cleanup-simplify.md) | Cursor **`/cleanup-simplify`** (+ `-all`) command |
| [`.cursor/agents/cleanup-simplify.md`](../.cursor/agents/cleanup-simplify.md) | Cursor **subagent** — isolated cleanup worker |
| [`.cursor/skills/cleanup-simplify/SKILL.md`](../.cursor/skills/cleanup-simplify/SKILL.md) | On-demand skill playbook |
| [`.cursor/rules/cleanup-simplify.mdc`](../.cursor/rules/cleanup-simplify.mdc) | Always-on reminder to clean after substantive edits |
| [`scripts/cleanup-verify.sh`](../scripts/cleanup-verify.sh) | Fast gate (typecheck, unit tests, overlay policy) |
| [`scripts/cleanup-verify-all.sh`](../scripts/cleanup-verify-all.sh) | Full integrity suite for `/cleanup-simplify -all` |
| [`scripts/install-cleanup-git-hook.sh`](../scripts/install-cleanup-git-hook.sh) | Optional local pre-commit verify hook |
| [`overlay/tests/fixtures/`](../overlay/tests/fixtures/) | Overframe-style loadout + screenshot stand-in |

## Default — `/cleanup-simplify`

1. Review `git diff` / changed files only
2. Simplify without changing behavior (prefer deletion; no drive-by refactors)
3. Run `./scripts/cleanup-verify.sh`
4. Summarize what was simplified vs left alone

## Full integrity — `/cleanup-simplify -all`

Runs the default cleanup pass **plus** the product integrity suite:

```bash
./scripts/cleanup-verify-all.sh
# or
npm run cleanup:verify:all
```

### Checklist (7 items)

1. **Overlay recommendations** for an Overframe-style fixture loadout (+ screenshot asset)
2. **Overlay buttons** exist, enabled, and signal-wired (offscreen Qt)
3. **Overlay chat** returns proper mocked HTTPS replies (no live key required)
4. **Web UI wiring** — Ordis stage, chat panel, composer, suggestion chips, API routes
5. **Web chat agent** — slash-command and model turn resolution (`resolveChatTurn`)
6. **Talking Ordis** — mood helpers + `data-mood="speaking"` on reply trigger path
7. **Functional / simplified** — typecheck, unit tests, web lint/build, overlay `--verify-external`, no conflict markers

### Overlay fixture note

Recommendations are **rule-based from loadout fields** (not OCR of Overframe pixels).  
`overlay/tests/fixtures/overframe_coda_hema_sp.json` encodes a realistic Overframe-style Coda Hema Steel Path sample; the PNG is a capture stand-in.

## Automate on every git change

The subagent file does not self-trigger on git. Pick one:

### A) Local pre-commit (mechanical)

```bash
./scripts/install-cleanup-git-hook.sh
```

Blocks broken commits via `cleanup-verify.sh` (no LLM). For full integrity on demand, run `cleanup-verify-all.sh` or `/cleanup-simplify -all`.

### B) Cursor Cloud Automation (LLM cleanup on push/PR)

At [cursor.com/automations](https://cursor.com/automations) (or `/automate`):

1. Trigger: Push to branch and/or PR pushed  
2. Repo: this repository  
3. Prompt:

```text
You are the cleanup-simplify agent for this repo.
Inspect the latest commit/PR diff only.
Simplify and clean touched code without changing behavior.
Follow .cursor/agents/cleanup-simplify.md.
If the user/automation asks for full integrity, run ./scripts/cleanup-verify-all.sh;
otherwise run ./scripts/cleanup-verify.sh.
Fix failures without weakening tests.
If you make cleanup commits, push them to the same branch.
If nothing needs cleanup and verify passes, comment that the diff is already clean.
```

4. Ensure the cloud env can install deps and run tests (including PySide6 for overlay offscreen tests), then activate.

### C) Manual

Finish work → `/cleanup-simplify` or `/cleanup-simplify -all` → commit.

## Limits

- Cleanup must not change product behavior or public contracts
- It will not rewrite unrelated files for style
- Cloud Automations require your Cursor account + repo connection
- Pre-commit hook is optional and local-only (not committed into `.git/hooks`)
- Live OpenAI keys are not required for `-all` (chat paths are mocked)

## See also

- Full command catalog (`/list`): [`docs/commands.md`](commands.md)
