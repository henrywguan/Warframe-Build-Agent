---
name: git-workflow
description: Safe git status, branch, commit, and push hygiene for agent work.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, Git, Commit, Branch]
    category: software-development
    related_skills: [pr-workflow, implement-change, code-review]
---

# Git workflow

Keep history clean and intentional. Never destroy Operator work.

## When to use

- Committing finished work
- Branching for a feature
- Checking what changed before a PR

## Quick reference

```bash
git status -sb
git diff
git diff --stat
git log --oneline -15
git checkout -b cursor/short-description
git add path1 path2
git commit -m "Clear summary of why"
git push -u origin HEAD
```

## Procedure

1. `git status` + `git diff` — know what’s dirty before acting.
2. Don’t commit secrets (`.env`, keys, cookies, `credentials`).
3. Stage related files only; leave unrelated Operator WIP alone.
4. Commit message: why-focused, 1–3 sentences if needed.
5. Push only when asked or when the Operator’s workflow expects it.
6. Never `git reset --hard`, force-push shared branches, or amend pushed commits unless explicitly requested.

## Pitfalls

- Committing `node_modules/` or build artifacts
- Huge mixed commits (feature + unrelated formatting)
- Updating git config

## Verification

- `git status` clean or intentionally dirty (stated)
- Commit hash exists on the expected branch
