---
name: env-bootstrap
description: Install toolchains and dependencies until the project runs locally.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Environment, Setup, Dependencies]
    category: software-development
    related_skills: [shell-discipline, test-verify, debug-issue]
---

# Environment bootstrap

Bring a checkout from “clone” to “commands work” without cargo-cult installs.

## When to use

- Missing `node_modules`, venv, toolchain
- CI passes but local fails on PATH/version
- New Operator machine / clean cloud VM

## Procedure

1. Detect stack (package.json, pnpm-lock, pyproject, go.mod, etc.).
2. Check versions (`node -v`, `python --version`, …) against engines/docs.
3. Install with the repo’s package manager (prefer lockfile: `npm ci` / `pnpm i --frozen-lockfile`).
4. Copy `.env.example` → `.env` only if needed; never invent production secrets.
5. Start required services (Docker compose, etc.) if docs say so.
6. Run a smoke command from README (`npm test`, `npm run build`, CLI `--help`).
7. Stop after smoke green; don’t “upgrade everything.”

## Pitfalls

- Global installs when a local toolchain suffices
- Running outdated setup from memory instead of README
- Committing lockfile churn unrelated to the task

## Verification

- Smoke command exit 0 (or clear blocker)
- Versions recorded in the summary
