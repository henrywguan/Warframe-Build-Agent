---
name: test-verify
description: Run and extend tests; never weaken assertions to force green.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, Tests, QA, Verification]
    category: software-development
    related_skills: [implement-change, debug-issue, refactor-cleanup]
---

# Test & verify

Prove changes with the repo’s real checks. Prefer narrow tests first, then broader suites if needed.

## When to use

- After any behavior change
- Before claiming “done”
- When adding regression coverage for a bugfix

## Quick reference

```bash
# JS/TS (examples — detect from package.json)
npm test
npm run lint
npm run build
npx vitest run path/to/file.test.ts
npx tsc --noEmit

# Python
pytest -q
pytest path/to/test_file.py -q

# Go / Rust
go test ./...
cargo test
```

Also use project scripts when present (e.g. `./scripts/cleanup-verify.sh`).

## Procedure

1. Detect how this repo tests (package scripts, Makefile, CI config).
2. Run the **narrowest** check that covers the change.
3. If failing: fix code (or test if the test was wrong) — do **not** delete/weaken assertions to pass.
4. Add coverage when you fixed a bug or added behavior with no test.
5. Report exact commands + exit outcomes.

## Pitfalls

- Skipping tests because “it’s a small change”
- Snapshot updates without reading the diff
- Claiming CI green without local evidence

## Verification

- Relevant checks executed
- Failures explained or fixed
- New tests assert the real requirement
