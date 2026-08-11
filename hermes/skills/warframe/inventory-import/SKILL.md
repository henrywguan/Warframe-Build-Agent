---
name: inventory-import
description: Parse pasted owned gear and mod lists to personalize recommendations and progression advice.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Inventory, Progression, Builds]
    category: warframe
---

# Inventory import

## When to use

Operator pastes inventory export, owned mods, or gear lists for personalized advice.

## Procedure

1. Parse input: bullets, comma lists, Public Export JSON/text, or OCR loadout paste.
2. Normalize names; confirm via `npm run knowledge -- lookup "<item>"`.
3. Build owned/missing matrix for stated goal.
4. Chain to progression-profile, recommend-build, or farm-vs-buy as needed.
5. Session context only — no persistent storage unless repo adds it.
6. Flag unrecognized lines; ask rather than guess.

## Output shape

- Parsed summary (counts)
- Recognized vs unknown
- Owned / still need
- Personalized recommendation
- Missing-only farm/buy list
- Next step
