---
name: plan-task
description: Write a concrete implementation plan before large code changes.
version: 0.1.0
metadata:
  hermes:
    tags: [Coding, Planning, Design]
    category: software-development
    related_skills: [codebase-explore, implement-change, agent-loop]
---

# Plan task

Design before coding when the work is large, risky, or ambiguous. Don’t implement until the Operator accepts the plan (unless they said “just do it”).

## When to use

- Multi-file features, migrations, API changes
- Operator says “plan”, “design”, “approach”
- Don’t use for one-line fixes

## Procedure

1. Explore enough to ground the plan (`codebase-explore`).
2. State goal + non-goals.
3. List files likely touched.
4. Stepwise plan (ordered); mark risks and test strategy.
5. Call out alternatives only when they materially differ.
6. Ask for approval on destructive/ambiguous choices; otherwise present the default path.

## Output shape

```markdown
## Goal
## Non-goals
## Approach
1. …
## Files
- path — why
## Tests
## Risks
## Ready to implement?
```

## Pitfalls

- Planning from training memory instead of the repo
- Over-architecting (new frameworks “while we’re here”)

## Verification

- Plan is actionable without further invention
- Each step has a checkable done state
