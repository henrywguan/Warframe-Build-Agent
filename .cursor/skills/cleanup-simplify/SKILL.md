---
name: cleanup-simplify
description: Clean up and simplify recently changed code while keeping tests and the app working. Use after edits, before finishing work, or when asked to tidy.
---

# Cleanup & simplify

## When to use

- After a feature or bugfix lands
- Before opening/updating a PR
- User says “clean up”, “simplify”, “tidy”, or “refactor lightly”
- Parent agent finished edits and should verify nothing got messy

## Steps

1. Delegate to the **cleanup-simplify** subagent (`.cursor/agents/cleanup-simplify.md`) when available, or follow its workflow directly.
2. Review `git diff` / changed files only.
3. Simplify without changing behavior.
4. Run:

```bash
./scripts/cleanup-verify.sh
```

5. Report what changed and verification status.

## Done when

- Diff is simpler or unchanged for good reason
- `./scripts/cleanup-verify.sh` exits 0
- No unrelated files were rewritten
