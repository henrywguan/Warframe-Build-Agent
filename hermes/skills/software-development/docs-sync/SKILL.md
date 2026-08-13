---
name: docs-sync
description: Update docs when behavior changes and the Operator needs them.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, Docs, Markdown]
    category: software-development
    related_skills: [implement-change, pr-workflow]
---

# Docs sync

Keep documentation accurate — but don’t spam unsolicited markdown.

## When to use

- Operator asks for docs
- User-facing behavior/commands changed and docs would mislead
- New setup steps are required to use a feature

## When not to use

- Pure internal refactors with no user-visible change
- Operator didn’t ask and existing docs remain true

## Procedure

1. Find the canonical doc (README, `docs/`, skill README).
2. Update only the sections that drifted.
3. Prefer links to existing guides over duplicating content.
4. Keep examples copy-pastable and tested against real CLIs.
5. Mention docs paths in the final summary.

## Pitfalls

- Creating new .md files when an existing guide should be patched
- Docs that describe aspirational behavior not yet shipped

## Verification

- Doc commands match the code
- No contradictory versions/policy statements left behind
