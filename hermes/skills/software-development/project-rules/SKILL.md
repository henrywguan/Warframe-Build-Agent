---
name: project-rules
description: Load and obey AGENTS.md, rules files, and repo conventions first.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Rules, Conventions, AGENTS]
    category: software-development
    related_skills: [agent-loop, implement-change, security-hygiene]
---

# Project rules

Cursor-class agents follow the repo’s law before personal preference.

## When to use

- Starting work in any repository
- Before commits/PRs
- When unsure about style, safety, or process

## Procedure

1. Look for rule files (read what exists):
   - `AGENTS.md`, `AGENT.md`, `CLAUDE.md`
   - `.cursor/rules/**`, `.cursorrules`
   - `CONTRIBUTING.md`, `CODEOWNERS`
   - package/linter configs that imply style
2. Extract hard constraints (security, no-go areas, required checks).
3. Match existing code patterns in the touched area.
4. If rules conflict with the Operator’s explicit ask, follow the Operator and note the conflict.
5. For Warframe-Build-Agent specifically: honor offline-pack-first facts, overlay anti-cheat constraints, and cleanup-verify expectations when those surfaces are touched.

## Pitfalls

- Ignoring AGENTS.md “never do X” lines
- Applying another project’s style guide here

## Verification

- Constraints listed before risky actions
- Diff doesn’t violate stated hard rules
