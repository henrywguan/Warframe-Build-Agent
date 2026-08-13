---
name: vision-analyze
description: Read screenshots, diagrams, and UI images into actionable findings.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Vision, Images, UI, OCR]
    category: software-development
    related_skills: [browser-automate, debug-issue, implement-change, tool-orchestration]
---

# Vision analyze

Turn images into structured observations tied to code or product actions.

## When to use

- Operator attaches a screenshot/diagram
- Browser capture of a broken UI
- Warframe loadout screenshot (then hand off to loadout-compare with pasted mods if OCR is weak)

## Procedure

1. Use `vision_analyze` (or host vision) on the image.
2. Extract: visible text, layout, errors, component states, red highlights.
3. Map findings to likely code surfaces (component names, routes, CSS).
4. If text is needed for CLIs (mods list), produce a cleaned paste block.
5. Propose the next verifying action (repro steps, code read, fix).

## Output shape

- What’s on screen (bullets)
- Probable cause
- Exact strings/error codes copied
- Suggested next tool calls

## Pitfalls

- Inventing UI text not present in the image
- Ignoring OS/browser chrome vs app UI
- Skipping a code search after reading the screenshot

## Verification

- Quoted UI strings match the image
- Next step is actionable in the repo or browser
