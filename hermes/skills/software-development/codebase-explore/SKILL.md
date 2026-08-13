---
name: codebase-explore
description: Map a repo — find files, symbols, and call paths before editing.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, Explore, Search, Architecture]
    category: software-development
    related_skills: [agent-loop, plan-task, implement-change]
---

# Codebase explore

Build a mental map before changing code. Wrong file edits are the most expensive mistake.

## When to use

- Unfamiliar repo or area
- “Where is X handled?”
- Before `implement-change` / `debug-issue`

## Quick reference

```bash
# Structure
ls -la
rg --files | head

# Symbols / strings
rg -n "pattern" path/
rg -n "functionName|ClassName" -g '*.{ts,tsx,js,jsx,py,go,rs}'

# Git archaeology
git log --oneline -20 -- path/
git blame -L 1,40 path/file
```

Prefer Hermes `search_files` / `read_file` when available.

## Procedure

1. Identify stack (package.json, pyproject, go.mod, Cargo.toml, etc.).
2. Find entry points (CLI, HTTP routes, main, app router).
3. Trace the feature path: UI → API → domain → data.
4. Note tests next to code or under `tests/` / `__tests__`.
5. Record 3–10 key paths you’ll touch or depend on.
6. Stop exploring once the change locus is clear — don’t boil the ocean.

## Output shape

- Stack + package manager
- Key paths (bullet list)
- Likely edit points
- Test command guess
- Open questions (only if blocking)

## Verification

- You can name the file(s) to change and why
- You haven’t started unrelated refactors
