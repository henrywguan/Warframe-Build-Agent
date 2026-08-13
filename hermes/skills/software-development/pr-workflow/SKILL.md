---
name: pr-workflow
description: Prepare clear pull requests with summary, test plan, and scope.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, PullRequest, GitHub]
    category: software-development
    related_skills: [git-workflow, code-review, test-verify]
---

# PR workflow

Turn committed work into a reviewable pull request.

## When to use

- Operator asks for a PR / merge request
- Feature branch is ready for review

## Quick reference

```bash
git log main..HEAD --oneline
git diff main...HEAD --stat
gh pr create --title "…" --body "…"
gh pr view --web
```

## Procedure

1. Ensure commits are pushed (`git-workflow`).
2. Diff against the base branch; confirm scope.
3. Write PR body:
   - Summary (what/why)
   - Key changes
   - Test plan (commands run)
   - Notes / risks
4. Create or update the PR via `gh` or the host’s PR tool.
5. Link issues if applicable.
6. Do not merge unless asked.

## Output shape

```markdown
## Summary
## Changes
## Test plan
- [ ] …
## Risks
```

## Pitfalls

- Empty “fix stuff” titles
- PR includes unrelated WIP
- Skipping test plan

## Verification

- PR URL returned
- Title/body match the actual diff
