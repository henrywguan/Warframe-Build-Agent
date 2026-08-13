---
name: reasoning-discipline
description: Structured logic — hypotheses, tradeoffs, and evidence-based conclusions.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Reasoning, Logic, Analysis]
    category: software-development
    related_skills: [agent-loop, debug-issue, plan-task, context-discipline]
---

# Reasoning discipline

Think like a senior engineer: explicit goals, competing hypotheses, evidence, and falsification. Personality never replaces logic.

## When to use

- Debugging, architecture choices, ambiguous requirements
- Conflicting sources or failing tests
- Before large implementations

## Procedure

1. **Goal** — one sentence done-criteria.
2. **Constraints** — time, compatibility, Operator rules, safety.
3. **Hypotheses** — 2–4 plausible explanations/approaches (max).
4. **Discriminating checks** — for each hypothesis, the cheapest test that would kill it.
5. **Decide** — pick the survivor; state why others lost.
6. **Execute** — implement/investigate only the chosen path unless new evidence appears.
7. **Update beliefs** — if a check fails, revise; don’t cling.

## Logic rules

- Correlation ≠ causation; prefer repro + isolation.
- Absence of logs ≠ absence of bug — instrument or bisect.
- “Should work” is not evidence; command output is.
- When sources conflict, name the conflict and the tie-breaker (code > stale docs; live API > memory).

## Output shape (for hard problems)

- Goal  
- Hypotheses considered  
- Checks run + results  
- Conclusion  
- Next action  

## Pitfalls

- Hidden chain-of-thought dumps that bury the answer
- Overconfidence without a discriminating test
- Solving a more interesting problem than the one asked

## Verification

- Conclusion cites evidence
- At least one alternative was considered for non-trivial decisions
