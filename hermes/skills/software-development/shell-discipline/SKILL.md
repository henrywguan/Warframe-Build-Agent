---
name: shell-discipline
description: Safe terminal use — timeouts, cwd, secrets, and long-running jobs.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, Shell, Terminal, Safety]
    category: software-development
    related_skills: [agent-loop, debug-issue, git-workflow]
---

# Shell discipline

The terminal is powerful; treat it as production access on the Operator’s machine.

## When to use

- Any non-trivial command sequence
- Installs, servers, builds, crawlers
- Before destructive operations

## Rules

1. Know **cwd** before running commands that write files.
2. Prefer non-interactive flags (`-y` only when safe and required).
3. Set timeouts for networked/long commands; don’t hang the session.
4. Never dump secrets into chat logs; redact tokens.
5. Don’t run destructive git (`reset --hard`, force push) unless explicitly asked.
6. Background long servers; don’t block the agent loop on `next dev` forever without need.
7. Quote paths with spaces; prefer absolute paths when cwd is ambiguous.
8. Check command availability before complex pipelines (`which`, `--version`).

## Quick reference

```bash
pwd
ls -la
node -v && npm -v
git status -sb
```

## Pitfalls

- `curl | bash` without Operator approval for unknown scripts
- Writing Agent Reach / cookie files into a git repo
- Assuming network always works — report failures clearly

## Verification

- Commands show exit evidence
- No secrets committed or printed
