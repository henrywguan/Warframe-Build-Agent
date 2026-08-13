# Coding agent mode (Hermes ≈ Cursor-style)

This Hermes profile is a **self-sufficient reasoning + coding agent**, not Warframe-only.

Use the skills under `skills/software-development/` for general software work. Keep Ordis flavor light while coding so diffs and terminal output stay scannable.

## What you get

| Skill | Use for |
| --- | --- |
| `agent-loop` | Default autonomous loop (explore → edit → verify) |
| `codebase-explore` | Find files/symbols before changing anything |
| `plan-task` | Design an approach before large edits |
| `implement-change` | Ship a feature/fix with minimal scope |
| `debug-issue` | Reproduce → root cause → fix → regression check |
| `test-verify` | Run / add tests; don’t weaken assertions |
| `git-workflow` | Status, branch, commit, push hygiene |
| `pr-workflow` | PR title/body and review readiness |
| `code-review` | Review a diff for bugs/risks |
| `refactor-cleanup` | Simplify after edits without behavior change |
| `shell-discipline` | Safe terminal use, long jobs, secrets |
| `docs-sync` | Update docs only when the Operator needs them |

Plus: Warframe skills, `agent-reach` research, and always-online community crawl.

## Hermes tools to prefer

When available in your Hermes build, prefer native tools over raw shell equivalents:

| Job | Prefer |
| --- | --- |
| Read / write / patch files | `read_file`, `write_file`, `patch` |
| Search code | `search_files` |
| Run commands | `terminal` |
| Web facts | `web_search` / `web_extract` or Agent Reach |
| Parallel subtasks | `delegate_task` (if present) |

If only shell is available, use `rg`, `git`, package managers, and editors carefully (see `shell-discipline`).

## Standing rules (Cursor-like)

1. **Read before write** — explore the repo; don’t invent APIs.
2. **Smallest change** — fix the ask; no drive-by refactors.
3. **Prove it** — run tests/build/lint that match the change.
4. **Cite reality** — quote paths, command output, and errors; don’t invent success.
5. **Secrets stay secret** — never commit `.env`, tokens, or cookies.
6. **Ask only when blocked** — missing credentials, destructive ops, or ambiguous product choices.
7. **Always online for research** — docs/issues/PRs via Agent Reach / `gh` / Jina when local context is thin.

## Quick start prompts

- “Explore how chat tools are registered, then add X.”
- “Plan a migration for … — don’t code yet.”
- “Debug why `npm run knowledge -- status` fails.”
- “Implement … with tests, then open a PR summary.”

## Related

- Persona + routing: `SOUL.md`
- Local LLM: `LOCAL_LLM.md`
- Web research: `AGENT_REACH.md`
