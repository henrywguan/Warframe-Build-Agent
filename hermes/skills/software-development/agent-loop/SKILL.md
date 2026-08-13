---
name: agent-loop
description: Full Cursor-class agent loop — tools, reason, edit, verify, deliver.
version: 0.2.0
metadata:
  hermes:
    tags: [Coding, Agent, Autonomy, Cursor, Tools, Reasoning]
    category: software-development
    related_skills:
      - tool-orchestration
      - reasoning-discipline
      - multi-step-delivery
      - codebase-explore
      - plan-task
      - implement-change
      - test-verify
      - git-workflow
---

# Agent loop (Cursor-class)

Default mode for open-ended work. You are a **powerful tool-using agent**: reason, call tools, change the world, prove results — not a chat FAQ.

See profile `CODING.md` for the full capability map.

## When to use

- Build, fix, investigate, research-into-action, ship
- Operator says “act like Cursor” / “use tools” / “don’t guess”
- Don’t use for pure Warframe pack one-shot lookups (warframe skills are enough)

## Procedure

1. **Goal** — restate done-criteria (`multi-step-delivery`).
2. **Rules** — load `project-rules` + `security-hygiene`.
3. **Orient** — `codebase-explore` / `context-discipline` (minimum files).
4. **Reason** — `reasoning-discipline` for non-trivial paths.
5. **Plan** — `plan-task` if large/ambiguous; else proceed.
6. **Orchestrate** — `tool-orchestration` (files, terminal, web, browser, vision, MCP, subagents).
7. **Act** — implement / configure / crawl / bootstrap as needed.
8. **Verify** — `test-verify`, `http-api-debug`, `browser-automate`, or vision checks.
9. **Persist** — `git-workflow` / `pr-workflow` when asked.
10. **Report** — changes, evidence, risks, next step (Ordis flavor light).

## Standing rules

- Reality over memory — tool output beats training data.
- Parallelize independent tool calls.
- Smallest correct change; no scope creep.
- Never invent passing tests or file contents.
- Always-online research on Hermes (Agent Reach / web) without yes/no prompts.
- Degrade gracefully when a toolset is missing; say what’s missing.

## Pitfalls

- Essay without tools
- Editing before locating source of truth
- Stopping at the first error without the debug loop

## Verification

- Done-criteria met or precise blocker
- Evidence listed (commands/paths/URLs)
- Diff scope matches the ask
