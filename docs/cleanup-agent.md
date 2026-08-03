# Cleanup-simplify subagent

Keeps the codebase tidy after changes: simplify touched code, delete dead weight, and **keep the app working** (tests/typecheck green).  
Supports a full integrity mode for overlay + web UI.

## What’s in the repo

| Piece | Role |
| --- | --- |
| [`.cursor/agents/cleanup-simplify.md`](../.cursor/agents/cleanup-simplify.md) | Cursor **subagent** — isolated cleanup worker |
| [`.cursor/skills/cleanup-simplify/SKILL.md`](../.cursor/skills/cleanup-simplify/SKILL.md) | On-demand `/cleanup-simplify` (+ `-all`) skill |
| [`.cursor/rules/cleanup-simplify.mdc`](../.cursor/rules/cleanup-simplify.mdc) | Always-on reminder to clean after substantive edits |
| [`scripts/cleanup-verify.sh`](../scripts/cleanup-verify.sh) | Fast gate (typecheck, unit tests, overlay policy) |
| [`scripts/cleanup-verify-all.sh`](../scripts/cleanup-verify-all.sh) | Full integrity suite for `/cleanup-simplify -all` |
| [`scripts/install-cleanup-git-hook.sh`](../scripts/install-cleanup-git-hook.sh) | Optional local pre-commit verify hook |
| [`overlay/tests/fixtures/`](../overlay/tests/fixtures/) | Overframe-style loadout + screenshot stand-in |

## Use in Cursor chat

- `/cleanup-simplify` — tidy the recent diff + fast verify
- `/cleanup-simplify -all` — tidy + full overlay/web integrity checklist
- Parent agents should auto-delegate after substantive edits (see the cleanup rule)

## `/cleanup-simplify -all` covers

1. Overlay build recommendations for an Overframe-style fixture loadout (plus screenshot asset)
2. Overlay buttons enabled and signal-wired (offscreen Qt)
3. Overlay chat client mocked replies
4. Web UI elements linked (Ordis, chat, composer, APIs)
5. Web chat agent turn resolution (slash + model)
6. Talking Ordis mood/trigger helpers and `data-mood="speaking"` render
7. Functional suite: typecheck, tests, web lint/build, overlay `--verify-external`

Run locally:

```bash
./scripts/cleanup-verify-all.sh
# or
npm run cleanup:verify:all
```

### Overlay fixture note

Recommendations are **rule-based from loadout fields** (not OCR of Overframe pixels).  
`overlay/tests/fixtures/overframe_coda_hema_sp.json` encodes a realistic Overframe-style Coda Hema Steel Path sample; the PNG is a capture stand-in. Replace/add fixtures to cover other builds.

## Automate on every git change

The subagent file does not self-trigger on git. Pick one:

### A) Local pre-commit (mechanical)

```bash
./scripts/install-cleanup-git-hook.sh
```

Blocks broken commits via `cleanup-verify.sh` (no LLM). For full integrity on demand, run `cleanup-verify-all.sh`.

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
