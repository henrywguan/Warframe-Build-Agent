---
name: code-review
description: Review diffs for bugs, risks, and missing tests before merge.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, Review, Quality]
    category: software-development
    related_skills: [test-verify, pr-workflow, refactor-cleanup]
---

# Code review

Review like a careful teammate: correctness first, then clarity, then nits.

## When to use

- Operator asks “review this”
- Before opening a PR
- After a large agent-authored diff

## Procedure

1. Establish base…head diff (`git diff base...head` or PR files).
2. Skim for intent: does the diff match the claimed goal?
3. Check correctness: edge cases, error handling, nulls, races, security.
4. Check tests: behavior changes covered? assertions meaningful?
5. Check ops: migrations, feature flags, backward compatibility.
6. List findings by severity: blocker / should-fix / nit.
7. Suggest concrete fixes; avoid vague “consider improving”.

## Output shape

- Summary verdict (approve / request changes)
- Blockers
- Suggestions
- Nits (optional, short)
- Test gaps

## Pitfalls

- Style-only reviews that miss bugs
- Demanding rewrites unrelated to the PR goal

## Verification

- Every blocker cites a file/hunk
- Verdict is explicit
