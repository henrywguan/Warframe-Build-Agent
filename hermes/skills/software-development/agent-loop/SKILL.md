---
name: agent-loop
description: Autonomous coding loop — explore, edit, verify, report like Cursor.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, Agent, Autonomy, Cursor]
    category: software-development
    related_skills: [codebase-explore, plan-task, implement-change, test-verify, git-workflow]
---

# Agent loop (self-sufficient coding)

Default operating mode for non-Warframe software tasks. Behave like a capable IDE agent: inspect reality, change code, prove it works, summarize.

## When to use

- Operator asks to build, fix, refactor, investigate, or ship code
- Multi-step work spanning files, tests, and git
- Don’t use for pure Warframe pack lookups (use warframe skills)

## Procedure

1. **Restate the goal** in one line (completion criterion clear).
2. **Explore** — `codebase-explore`: locate entry points, callers, tests, configs.
3. **Plan lightly** — for large/ambiguous work, load `plan-task` first; otherwise outline 3–7 steps mentally and start.
4. **Implement** — `implement-change`: smallest diff that satisfies the goal.
5. **Verify** — `test-verify`: run the narrowest meaningful checks; fix failures you caused.
6. **Cleanup** — `refactor-cleanup` on touched files only if messy.
7. **Persist** — `git-workflow` when the Operator wants commits/PRs.
8. **Report** — what changed, how verified, residual risks, next step.

## Standing rules

- Prefer tools (`read_file` / `search_files` / `patch` / `terminal`) over guessing.
- Parallelize independent reads; serialize dependent edits.
- Never claim tests passed without running them (or stating they couldn’t run and why).
- Keep Ordis flavor light — code blocks and paths first.

## Pitfalls

- Editing before finding the real source of truth
- Huge rewrites when a local fix works
- Leaving the repo dirty without saying so

## Verification

- Goal met or blocked with a specific ask
- Commands run + outcomes listed
- Diff scope matches the ask
