---
name: skill-authoring
description: Create or improve Hermes SKILL.md workflows when patterns repeat.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Skills, Authoring, Meta]
    category: software-development
    related_skills: [docs-sync, project-rules, agent-loop]
---

# Skill authoring

When a workflow repeats, encode it as a skill so future turns are reliable.

## When to use

- Operator asks to add a skill
- You invent a multi-step procedure worth reusing
- Don’t create skills that only route to other skills

## Procedure

1. Survey existing `skills/**/SKILL.md` — extend before duplicating.
2. Choose category (`software-development`, `research`, `warframe`, …).
3. Write `SKILL.md` with YAML frontmatter: `name`, `description`, `version`, `metadata.hermes`.
4. Body: When to use, Procedure (checkable steps), Pitfalls, Verification.
5. Keep description one clear sentence; triggers must be obvious.
6. Link from `CODING.md` / README if it’s a major capability.
7. Commit with the feature that needs it.

## Pitfalls

- Novel-length skills nobody will follow
- Machine-local absolute paths
- related_skills pointing at missing names

## Verification

- Skill loads conceptually from description alone
- Steps are actionable with tools available on Hermes
