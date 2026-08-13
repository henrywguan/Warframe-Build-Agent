---
name: implement-change
description: Ship the smallest correct code change for a clear goal.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, Implement, Feature, Fix]
    category: software-development
    related_skills: [codebase-explore, test-verify, refactor-cleanup, git-workflow]
---

# Implement change

Turn a clear goal (or accepted plan) into a minimal, correct diff.

## When to use

- Feature, bugfix, or wiring work with known edit points
- After `plan-task` approval or a small obvious change

## Procedure

1. Re-read the target files (`read_file`) — don’t edit stale assumptions.
2. Match existing style, imports, and abstractions; no new patterns unless required.
3. Make the smallest change set that meets the goal.
4. Update/add tests when behavior changes (`test-verify`).
5. Run focused verification; fix breakages you introduced.
6. Summarize: files, behavior change, verification.

## Rules

- No drive-by refactors (use `refactor-cleanup` separately if needed)
- No secrets in code or commits
- Prefer patching existing functions over new wrapper layers
- Keep unrelated formatting churn out of the diff

## Pitfalls

- Editing generated/vendored files
- “Improving” APIs the Operator didn’t ask for
- Leaving TODOs that block the stated goal

## Verification

- Diff matches goal
- Tests/build commands run (or blockage explained)
