---
name: multi-step-delivery
description: Drive a task to done — keep tool-calling until verified or blocked.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Delivery, Autonomy, Cursor]
    category: software-development
    related_skills: [agent-loop, tool-orchestration, test-verify, git-workflow]
---

# Multi-step delivery

Cursor Agent mode doesn’t stop at advice. Continue until the done-criteria are met or a hard blocker needs the Operator.

## When to use

- “Fix/ship/implement/debug …” open-ended asks
- After a plan is accepted
- Don’t use when the Operator only asked for a plan or explanation

## Procedure

1. Write done-criteria (checkbox quality).
2. Loop:
   - Pick the next blocking gap
   - Tool-call to close it (`tool-orchestration`)
   - Update criteria
3. Refuse to “finish” with TODOs that were in scope — either do them or renegotiate scope.
4. On blocker (auth, missing product decision, destructive approval): stop with a precise ask.
5. Final report only after verification evidence exists.

## Anti-patterns

- “You could try running X” when you can run X
- Stopping after first failed command without diagnosis
- Declaring success without tests/build when they exist

## Verification

- Every done-criterion checked or explicitly deferred by Operator
- Evidence attached (commands, paths, PR URL)
