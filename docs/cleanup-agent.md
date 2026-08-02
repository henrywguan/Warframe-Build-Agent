# Cleanup-simplify subagent

Keeps the codebase tidy after changes: simplify touched code, delete dead weight, and **keep the app working** (tests/typecheck green).

## What’s in the repo

| Piece | Role |
| --- | --- |
| [`.cursor/agents/cleanup-simplify.md`](../.cursor/agents/cleanup-simplify.md) | Cursor **subagent** — isolated cleanup worker |
| [`.cursor/skills/cleanup-simplify/SKILL.md`](../.cursor/skills/cleanup-simplify/SKILL.md) | On-demand `/cleanup-simplify` skill |
| [`.cursor/rules/cleanup-simplify.mdc`](../.cursor/rules/cleanup-simplify.mdc) | Always-on reminder to clean after substantive edits |
| [`scripts/cleanup-verify.sh`](../scripts/cleanup-verify.sh) | Mechanical verify (typecheck, tests, overlay checks) |
| [`scripts/install-cleanup-git-hook.sh`](../scripts/install-cleanup-git-hook.sh) | Optional local pre-commit verify hook |

## Use in Cursor chat

- Type **`/cleanup-simplify`** after a change set, or
- Ask: “clean up and simplify the diff; keep tests green”, or
- Parent agents should auto-delegate when the rule matches

The subagent must stay in the recent diff’s scope and run:

```bash
./scripts/cleanup-verify.sh
```

## “Every git change” options

Subagents do **not** auto-run on git by themselves. Wire one of these:

### A) Local pre-commit (mechanical)

```bash
./scripts/install-cleanup-git-hook.sh
```

Runs `cleanup-verify.sh` before each commit. Does not run the LLM; it only blocks broken commits.

### B) Cursor Cloud Automation (LLM cleanup on push/PR)

Create an Automation at [cursor.com/automations](https://cursor.com/automations) (or `/automate`):

1. **Trigger:** Push to branch and/or PR pushed  
2. **Repo:** this repository  
3. **Prompt:**

```text
You are the cleanup-simplify agent for this repo.
Inspect the latest commit/PR diff only.
Simplify and clean touched code without changing behavior.
Follow .cursor/agents/cleanup-simplify.md.
Run ./scripts/cleanup-verify.sh and fix failures without weakening tests.
If you make cleanup commits, push them to the same branch.
If nothing needs cleanup and verify passes, comment that the diff is already clean.
```

4. Ensure the cloud environment can `npm install` / run tests  
5. Activate the automation

### C) Manual after each agent task

Finish the feature → run `/cleanup-simplify` → commit.

## Verify script details

`scripts/cleanup-verify.sh` runs:

- `npm run typecheck`
- `npm test`
- Overlay unit tests + `--verify-external` when `overlay/` is present
- Optional web lint when `web/` changed or `CLEANUP_VERIFY_WEB=1`

## Limits

- Cleanup must not change product behavior or public contracts
- It will not rewrite unrelated files for style
- Cloud Automations require your Cursor account + repo connection
- Pre-commit hook is optional and local-only (not committed into `.git/hooks`)
