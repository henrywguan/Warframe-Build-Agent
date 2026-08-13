---
name: context-discipline
description: Keep working memory tight — load only files and facts that matter.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Context, Memory, Focus]
    category: software-development
    related_skills: [codebase-explore, agent-loop, reasoning-discipline]
---

# Context discipline

Cursor-class agents fail when they drown in irrelevant files. Pull the minimum context that makes the next action correct.

## When to use

- Large repos
- Long sessions
- Before planning or implementing

## Procedure

1. Start from the ask — which subsystem could possibly matter?
2. Find entry points (`codebase-explore`); don’t open every match.
3. Read the 1–3 most relevant files fully; skim neighbors only as needed.
4. Keep a short scratch list: goal, key paths, constraints, open questions.
5. Drop stale hypotheses from the scratch list when disproven.
6. Prefer searching again over rereading an entire module “just in case.”

## Working memory template

```text
Goal:
Done when:
Key paths:
Constraints:
Open questions:
Next tool call:
```

## Pitfalls

- Opening twenty files before the first edit
- Pasting huge logs into the answer instead of summarizing
- Forgetting project rules already loaded

## Verification

- You can state why each open file is necessary
- Next action is concrete
