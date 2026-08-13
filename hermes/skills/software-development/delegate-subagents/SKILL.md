---
name: delegate-subagents
description: Split work into parallel subtasks and merge results cleanly.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Subagents, Parallel, Delegation]
    category: software-development
    related_skills: [agent-loop, tool-orchestration, multi-step-delivery]
---

# Delegate subagents

Use parallelism for independent investigations. Keep one owner for merges and edits.

## When to use

- Multiple unrelated research questions
- Explore several code areas at once
- Don’t use for tightly coupled sequential edits (race conditions)

## Procedure

1. Split into subtasks with **non-overlapping write targets**.
2. Give each subtask: goal, paths/hints, done criteria, “read-only” if exploring.
3. Prefer `delegate_task` (or host equivalent); else run sequential tool batches yourself.
4. Merge: resolve conflicts, one coherent plan/diff.
5. Single-thread final implementation and verification.

## Prompt template for a subtask

```text
Goal:
Read-only: yes/no
Paths to start:
Return: findings + evidence paths + recommended next edit
Do not: commit, push, or edit outside …
```

## Pitfalls

- Two workers editing the same file
- Delegating without done criteria (vague summaries come back)
- Too many delegates → thrash

## Verification

- Subtask outputs cited
- Final diff has one coherent authoring pass
