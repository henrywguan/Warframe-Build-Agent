---
name: debug-issue
description: Reproduce bugs, find root cause, fix, and add a regression check.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, Debug, RootCause]
    category: software-development
    related_skills: [codebase-explore, test-verify, implement-change, shell-discipline]
---

# Debug issue

Tight loop: reproduce → isolate → fix → prove. Don’t shotgun-edit.

## When to use

- Errors, wrong output, flaky tests, “it doesn’t work”
- Operator pastes a stack trace or failing command

## Procedure

1. Capture the failing command + full error text.
2. Reproduce once (same command) — note exit code/output.
3. Form 1–3 hypotheses; pick the cheapest check first.
4. Trace with logs/reads/bisect; confirm root cause before fixing.
5. Implement the minimal fix (`implement-change`).
6. Add or extend a regression test when practical (`test-verify`).
7. Re-run the original failing command; confirm green.

## Output shape

- Repro steps
- Root cause (file/line or config)
- Fix summary
- Verification commands + results

## Pitfalls

- Fixing symptoms (catch-all try/except, deleting assertions)
- Changing multiple variables at once
- “Works on my machine” without the repro command

## Verification

- Original failure no longer reproduces
- Related tests pass
