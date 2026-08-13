---
name: refactor-cleanup
description: Simplify touched code without changing behavior; keep tests green.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, Refactor, Cleanup]
    category: software-development
    related_skills: [test-verify, implement-change, code-review]
---

# Refactor & cleanup

After substantive edits, tidy **only** what you touched. Behavior stays identical.

## When to use

- Post-feature cleanup
- Operator asks to simplify / tidy
- Dead code left by the change

## Procedure

1. Limit scope to the current diff / task files.
2. Remove dead code, unused imports, redundant wrappers.
3. Prefer clearer names and less nesting — no cleverness.
4. Do not rename public APIs unless required.
5. Run verification (`test-verify` / project cleanup scripts).
6. Never weaken tests to pass cleanup.

## Project note (Warframe-Build-Agent)

If cwd is this repo and cleanup scripts exist:

```bash
./scripts/cleanup-verify.sh
# full integrity when Operator asks:
./scripts/cleanup-verify-all.sh
```

## Pitfalls

- Drive-by refactors in untouched modules
- “While I’m here” features
- Formatting an entire file for a one-line fix

## Verification

- Behavior unchanged
- Checks still green
- Diff only contains intentional cleanups
